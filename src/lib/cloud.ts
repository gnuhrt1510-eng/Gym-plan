import { useEffect, useRef, useState } from 'react'

/**
 * Đồng bộ dữ liệu lên kho riêng của người dùng trong Claude (capability `db`).
 * - Chỉ hoạt động khi app mở trong Claude; trên web thường (GitHub Pages) trả null → chỉ lưu trên máy.
 * - Dữ liệu chia thành nhiều document nhỏ (≤ 256 KiB/doc): mỗi "chunk" một doc, chỉ ghi chunk thay đổi.
 * - Khi mở app: bản nào mới hơn (máy hay Claude) thì dùng bản đó.
 */

type Snap = { id: string; exists: boolean; data(): Record<string, unknown> | undefined }
type DocRef = { set(d: Record<string, unknown>): Promise<void>; delete(): Promise<void> }
type Coll = { doc(id: string): DocRef; limit(n: number): { get(): Promise<{ docs: Snap[] }> } }
type DB = { collection(path: string): Coll }
type ClaudeWin = { claude?: { use?: (n: string) => Promise<unknown> } }

export type SyncStatus = 'local' | 'connecting' | 'synced' | 'saving' | 'error'

let cloudPromise: Promise<{ coll: Coll } | null> | null = null

function getCloud(): Promise<{ coll: Coll } | null> {
  if (cloudPromise) return cloudPromise
  cloudPromise = (async () => {
    const claude = (window as unknown as ClaudeWin).claude
    if (!claude?.use) return null
    try {
      const [db, user] = (await Promise.all([claude.use('db'), claude.use('user')])) as [DB | null, { id(): Promise<string | null> } | null]
      const id = await user?.id()
      if (!db || !id) return null
      return { coll: db.collection(`data/users/${id}`) }
    } catch {
      return null
    }
  })()
  return cloudPromise
}

/* ---- trạng thái chung để hiện "Đã lưu" ---- */
const statusByChannel = new Map<string, SyncStatus>()
const listeners = new Set<() => void>()
let lastSavedAt = 0
function setStatus(ch: string, s: SyncStatus) {
  statusByChannel.set(ch, s)
  if (s === 'synced') lastSavedAt = Date.now()
  listeners.forEach((l) => l())
}
export function overallStatus(): SyncStatus {
  const all = [...statusByChannel.values()]
  if (all.length === 0) return 'connecting'
  for (const s of ['error', 'saving', 'connecting'] as const) if (all.includes(s)) return s
  return all.includes('synced') ? 'synced' : 'local'
}
export function useSyncStatus(): { status: SyncStatus; savedAt: number } {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  return { status: overallStatus(), savedAt: lastSavedAt }
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

/**
 * Hook đồng bộ một "kênh" dữ liệu (vd 'app', 'runs').
 * toChunks: chia dữ liệu thành các doc; fromChunks: ghép lại.
 * isEmpty: dữ liệu máy này còn trống (chưa nhập gì) → luôn nhận bản trên Claude.
 */
export function useCloudSync<T>(
  channel: string,
  value: T,
  setValue: (v: T) => void,
  toChunks: (v: T) => Chunks,
  fromChunks: (c: Chunks) => T,
  isEmpty: (v: T) => boolean,
) {
  const stampKey = `gymplan:sync:${channel}:updatedAt`
  const ready = useRef(false)
  const cloud = useRef<{ coll: Coll } | null>(null)
  const saved = useRef(new Map<string, string>()) // docId → JSON đã lưu
  const applyingRemote = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const writing = useRef(false)
  const latest = useRef(value)
  latest.current = value

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
        if (id.startsWith(prefix) && id !== `${channel}~meta` && !(id.slice(prefix.length) in chunks)) {
          await c.coll.doc(id).delete()
          saved.current.delete(id)
        }
      }
      await c.coll.doc(`${channel}~meta`).set({ updatedAt: stamp })
      writeLocalStamp(stampKey, stamp)
      setStatus(channel, 'synced')
    } catch {
      setStatus(channel, 'error')
    } finally {
      writing.current = false
    }
  }

  // Kết nối + chọn bản mới hơn khi mở app
  useEffect(() => {
    let alive = true
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
        const snap = await c.coll.limit(1000).get()
        const remote: Chunks = {}
        let remoteStamp = 0
        for (const d of snap.docs) {
          if (!d.exists) continue
          const body = d.data() ?? {}
          if (d.id === `${channel}~meta`) remoteStamp = Number(body.updatedAt) || 0
          else if (d.id.startsWith(`${channel}.`)) {
            remote[d.id.slice(channel.length + 1)] = body
            saved.current.set(d.id, JSON.stringify(body))
          }
        }
        const localStamp = readLocalStamp(stampKey)
        const hasRemote = Object.keys(remote).length > 0
        if (hasRemote && (remoteStamp > localStamp || isEmpty(latest.current))) {
          applyingRemote.current = true
          setValue(fromChunks(remote))
          writeLocalStamp(stampKey, remoteStamp)
          ready.current = true
          setStatus(channel, 'synced')
        } else {
          ready.current = true
          await flush()
        }
      } catch {
        setStatus(channel, 'error')
        ready.current = true
      }
    })()
    return () => {
      alive = false
      if (timer.current) clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mỗi lần dữ liệu đổi: đánh dấu trên máy + lưu lên Claude sau 1.2 s
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
    timer.current = setTimeout(() => void flush(), 1200)
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
