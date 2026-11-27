import { useEffect, useRef, useState } from 'react'

/**
 * Đồng bộ dữ liệu lên kho DÙNG CHUNG của link Claude (capability `db`).
 * - Chủ link và những người được mời quyền Editor cùng đọc/sửa một bộ dữ liệu (collection `shared`).
 * - Dữ liệu cũ ở vùng riêng `data/users/<id>` được chuyển sang vùng chung ở lần mở đầu tiên.
 * - Chỉ hoạt động khi app mở trong Claude; trên web thường trả null → chỉ lưu trên máy.
 * - Chia thành document nhỏ (≤ 256 KiB/doc), chỉ ghi phần thay đổi.
 * - Theo dõi document `<kênh>~meta`: người khác lưu → tải lại phần đã đổi.
 */

type Snap = { id: string; exists: boolean; data(): Record<string, unknown> | undefined; metadata?: { hasPendingWrites: boolean } }
type DocRef = {
  set(d: Record<string, unknown>): Promise<void>
  delete(): Promise<void>
  onSnapshot(next: (s: Snap) => void, err?: (e: unknown) => void): () => void
}
type Coll = { doc(id: string): DocRef; limit(n: number): { get(): Promise<{ docs: Snap[] }> } }
type DB = { collection(path: string): Coll }
type ClaudeWin = { claude?: { use?: (n: string) => Promise<unknown> } }

export type SyncStatus = 'local' | 'connecting' | 'synced' | 'saving' | 'error'

export const SHARED_COLLECTION = 'shared'

interface Cloud {
  coll: Coll
  legacy: Coll | null
}

let cloudPromise: Promise<Cloud | null> | null = null

function getCloud(): Promise<Cloud | null> {
  if (cloudPromise) return cloudPromise
  cloudPromise = (async () => {
    const claude = (window as unknown as ClaudeWin).claude
    if (!claude?.use) return null
    try {
      const [db, user] = (await Promise.all([claude.use('db'), claude.use('user')])) as [DB | null, { id(): Promise<string | null> } | null]
      if (!db) return null
      const id = await user?.id().catch(() => null)
      return { coll: db.collection(SHARED_COLLECTION), legacy: id ? db.collection(`data/users/${id}`) : null }
    } catch {
      return null
    }
  })()
  return cloudPromise
}

/* ---- trạng thái chung để hiện "Đã lưu" ---- */
const statusByChannel = new Map<string, SyncStatus>()
const listeners = new Set<() => void>()
function setStatus(ch: string, s: SyncStatus) {
  statusByChannel.set(ch, s)
  listeners.forEach((l) => l())
}
export function overallStatus(): SyncStatus {
  const all = [...statusByChannel.values()]
  if (all.length === 0) return 'connecting'
  for (const s of ['error', 'saving', 'connecting'] as const) if (all.includes(s)) return s
  return all.includes('synced') ? 'synced' : 'local'
}
export function useSyncStatus(): { status: SyncStatus } {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return { status: overallStatus() }
}

function readLocalStamp(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0
  } catch {
    return 0
  }
}
function writeLocalStamp(key: string, v: number) {
  try {
    localStorage.setItem(key, String(v))
  } catch {
    /* bỏ qua */
  }
}

export type Chunks = Record<string, Record<string, unknown>>

/** Đọc các chunk của một kênh trong collection; trả về chunks, JSON từng doc và mốc thời gian */
async function readChannel(coll: Coll, channel: string) {
  const snap = await coll.limit(1000).get()
  const chunks: Chunks = {}
  const json = new Map<string, string>()
  let stamp = 0
  for (const d of snap.docs) {
    if (!d.exists) continue
    const body = d.data() ?? {}
    if (d.id === `${channel}~meta`) stamp = Number(body.updatedAt) || 0
    else if (d.id.startsWith(`${channel}.`)) {
      chunks[d.id.slice(channel.length + 1)] = body
      json.set(d.id, JSON.stringify(body))
    }
  }
  return { chunks, json, stamp }
}

/**
 * Hook đồng bộ một "kênh" dữ liệu (vd 'app', 'runs').
 * toChunks: chia dữ liệu thành các doc; fromChunks: ghép lại.
 * isEmpty: dữ liệu máy này còn trống → luôn nhận bản trên Claude.
 * applyRemote: cách thay dữ liệu bằng bản tải về (mặc định: thay hết).
 */
export function useCloudSync<T>(
  channel: string,
  value: T,
  applyRemote: (v: T) => void,
  toChunks: (v: T) => Chunks,
  fromChunks: (c: Chunks) => T,
  isEmpty: (v: T) => boolean,
) {
  const stampKey = `gymplan:sync:${channel}:updatedAt`
  const ready = useRef(false)
  const cloud = useRef<Cloud | null>(null)
  const saved = useRef(new Map<string, string>()) // docId → JSON đã lưu ở vùng chung
  const myStamp = useRef(0) // mốc của lần lưu gần nhất từ máy này
  const seenStamp = useRef(0) // mốc mới nhất đã áp dụng
  const applyingRemote = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const writing = useRef(false)
  const latest = useRef(value)
  latest.current = value

  const apply = (v: T, stamp: number) => {
    applyingRemote.current = true
    seenStamp.current = stamp
    // cập nhật ngay để lần lưu kế tiếp (vd khi chuyển dữ liệu cũ) dùng đúng bản vừa nạp
    latest.current = v
    applyRemote(v)
    writeLocalStamp(stampKey, stamp)
  }

  const flush = async () => {
    const c = cloud.current
    if (!c || writing.current) return
    writing.current = true
    setStatus(channel, 'saving')
    try {
      const stamp = Date.now()
      const chunks = toChunks(latest.current)
      const prefix = `${channel}.`
      for (const [key, body] of Object.entries(chunks)) {
        const id = prefix + key
        const json = JSON.stringify(body)
        if (saved.current.get(id) === json) continue
        await c.coll.doc(id).set(body)
        saved.current.set(id, json)
      }
      for (const id of [...saved.current.keys()]) {
        if (id.startsWith(prefix) && !(id.slice(prefix.length) in chunks)) {
          await c.coll.doc(id).delete()
          saved.current.delete(id)
        }
      }
      myStamp.current = stamp
      seenStamp.current = stamp
      await c.coll.doc(`${channel}~meta`).set({ updatedAt: stamp })
      writeLocalStamp(stampKey, stamp)
      setStatus(channel, 'synced')
    } catch {
      setStatus(channel, 'error')
    } finally {
      writing.current = false
    }
  }

  // Kết nối + chọn bản mới hơn khi mở app, rồi theo dõi thay đổi của người khác
  useEffect(() => {
    let alive = true
    let unsub: (() => void) | null = null
    setStatus(channel, 'connecting')
    ;(async () => {
      const c = await getCloud()
      if (!alive) return
      if (!c) {
        setStatus(channel, 'local')
        return
      }
      cloud.current = c
      try {
        const shared = await readChannel(c.coll, channel)
        saved.current = shared.json
        let remote = shared
        let fromLegacy = false
        if (Object.keys(shared.chunks).length === 0 && c.legacy) {
          // Lần đầu dùng vùng chung: lấy dữ liệu cũ ở vùng riêng (nếu có) để chuyển sang
          const old = await readChannel(c.legacy, channel).catch(() => null)
          if (old && Object.keys(old.chunks).length > 0) {
            remote = old
            fromLegacy = true
          }
        }
        const localStamp = readLocalStamp(stampKey)
        const hasRemote = Object.keys(remote.chunks).length > 0
        if (hasRemote && (remote.stamp > localStamp || isEmpty(latest.current))) {
          apply(fromChunks(remote.chunks), remote.stamp)
          ready.current = true
          if (fromLegacy) await flush()
          else setStatus(channel, 'synced')
        } else {
          ready.current = true
          await flush()
        }
        if (!alive) return
        // Người khác lưu → tải lại
        unsub = c.coll.doc(`${channel}~meta`).onSnapshot(
          (s) => {
            if (!s.exists || s.metadata?.hasPendingWrites) return
            const stamp = Number(s.data()?.updatedAt) || 0
            if (stamp <= seenStamp.current || stamp === myStamp.current) return
            if (timer.current || writing.current) return // máy này đang có thay đổi chưa lưu: giữ bản của mình
            void readChannel(c.coll, channel)
              .then((r) => {
                if (!alive || Object.keys(r.chunks).length === 0) return
                saved.current = r.json
                apply(fromChunks(r.chunks), r.stamp)
                setStatus(channel, 'synced')
              })
              .catch(() => {})
          },
          () => {},
        )
      } catch {
        setStatus(channel, 'error')
        ready.current = true
      }
    })()
    return () => {
      alive = false
      unsub?.()
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mỗi lần dữ liệu đổi trên máy này: lưu lên Claude sau 1.2 s
  useEffect(() => {
    if (applyingRemote.current) {
      applyingRemote.current = false
      return
    }
    if (!ready.current) return
    writeLocalStamp(stampKey, Date.now())
    if (!cloud.current) return
    if (timer.current) clearTimeout(timer.current)
    setStatus(channel, 'saving')
    timer.current = setTimeout(() => {
      timer.current = null
      void flush()
    }, 1200)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  // Lưu ngay khi rời trang
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && timer.current) {
        clearTimeout(timer.current)
        timer.current = null
        void flush()
      }
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/** Gom mảng theo tháng: key "YYYY-MM" */
export function byMonth<T>(items: T[], dateOf: (x: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {}
  for (const it of items) (out[dateOf(it).slice(0, 7)] ??= []).push(it)
  return out
}
