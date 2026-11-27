import { fitView, formatDuration, formatKm, formatPace, paceSecPerKm, project, type Run } from './run'

export type StoryVariant = 'dark' | 'sticker'

const W = 1080
const H = 1920
const LIME = '#d4ff3a'

function dateLabel(ts: number): string {
  const d = new Date(ts)
  const days = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
  return `${days[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

/**
 * Ảnh story 1080×1920.
 *  - dark: nền tối, đầy đủ thông số — đăng thẳng
 *  - sticker: nền trong suốt — dán đè lên ảnh/video của bạn trên Instagram
 */
export async function renderStory(run: Run, variant: StoryVariant): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  try {
    await document.fonts?.ready
  } catch {
    /* dùng font dự phòng */
  }
  const display = "800 FONT 'Sora', 'Inter', system-ui, sans-serif"
  const body = "600 FONT 'Inter', system-ui, sans-serif"
  const font = (tpl: string, px: number) => tpl.replace('FONT', `${px}px`)

  if (variant === 'dark') {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#15171b')
    g.addColorStop(1, '#0b0c0e')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    // lưới mờ cho cảm giác bản đồ
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 2
    for (let x = 0; x <= W; x += 90) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }
    for (let y = 0; y <= H; y += 90) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }
  }

  const text = variant === 'dark' ? '#f3f5ef' : '#ffffff'
  const muted = variant === 'dark' ? '#8b919b' : 'rgba(255,255,255,0.85)'
  const shadow = (on: boolean) => {
    ctx.shadowColor = on && variant === 'sticker' ? 'rgba(0,0,0,0.55)' : 'transparent'
    ctx.shadowBlur = on && variant === 'sticker' ? 18 : 0
  }

  // ---- đường chạy ----
  const box = variant === 'dark' ? { x: 90, y: 300, w: 900, h: 900 } : { x: 140, y: 380, w: 800, h: 760 }
  if (run.points.length > 1) {
    const view = fitView(run.points, box.w, box.h, 0.04, 18)
    const xy = run.points.map((p) => {
      const [x, y] = project(p[0], p[1], view.zoom)
      return [box.x + x - view.x0, box.y + y - view.y0, p[3]] as const
    })
    const drawPath = () => {
      ctx.beginPath()
      xy.forEach(([x, y, seg], i) => {
        if (i === 0 || seg !== xy[i - 1][2]) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
    }
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.save()
    ctx.shadowColor = variant === 'dark' ? 'rgba(212,255,58,0.55)' : 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 30
    ctx.strokeStyle = LIME
    ctx.lineWidth = 16
    drawPath()
    ctx.stroke()
    ctx.restore()
    const [sx, sy] = xy[0]
    const [ex, ey] = xy[xy.length - 1]
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(sx, sy, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = LIME
    ctx.beginPath()
    ctx.arc(ex, ey, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#0b0c0e'
    ctx.lineWidth = 6
    ctx.stroke()
  }

  // ---- tiêu đề ----
  shadow(true)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = LIME
  ctx.font = font(display, 40)
  ctx.fillText('⚡ GYM PLAN', 90, 150)
  ctx.fillStyle = text
  ctx.font = font(display, 64)
  ctx.fillText(run.title, 90, 230)
  ctx.fillStyle = muted
  ctx.font = font(body, 34)
  ctx.textAlign = 'right'
  ctx.fillText(dateLabel(run.startedAt), W - 90, 150)
  ctx.textAlign = 'left'

  // ---- số liệu ----
  const baseY = variant === 'dark' ? 1330 : 1270
  ctx.fillStyle = text
  ctx.font = font(display, 230)
  const km = formatKm(run.distanceM)
  ctx.fillText(km, 80, baseY + 180)
  const kmW = ctx.measureText(km).width
  ctx.fillStyle = LIME
  ctx.font = font(display, 72)
  ctx.fillText('km', 100 + kmW, baseY + 180)

  const stats: [string, string][] = [
    ['Pace', `${formatPace(paceSecPerKm(run.distanceM, run.durationMs))} /km`],
    ['Thời gian', formatDuration(run.durationMs)],
    ['Bước', run.steps.toLocaleString('vi-VN')],
  ]
  const colW = (W - 180) / 3
  stats.forEach(([label, value], i) => {
    const x = 90 + i * colW
    ctx.fillStyle = muted
    ctx.font = font(body, 32)
    ctx.fillText(label.toUpperCase(), x, baseY + 300)
    ctx.fillStyle = text
    ctx.font = font(display, 60)
    ctx.fillText(value, x, baseY + 375)
  })
  shadow(false)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas'))), 'image/png'))
}

type DownloadsNS = { save: (r: { filename: string; data: Blob }) => Promise<unknown> }
type ClaudeWin = { claude?: { use?: (n: string) => Promise<unknown> } }

/** Chia sẻ (mở bảng chia sẻ → Instagram story) hoặc lưu ảnh */
export async function shareOrSave(blob: Blob, filename: string): Promise<'shared' | 'saved' | 'cancelled' | 'failed'> {
  const file = new File([blob], filename, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] })
      return 'shared'
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled'
    }
  }
  const claude = (window as unknown as ClaudeWin).claude
  if (claude?.use) {
    const dl = (await claude.use('downloads').catch(() => null)) as DownloadsNS | null
    if (dl) {
      try {
        await dl.save({ filename, data: blob })
        return 'saved'
      } catch (e) {
        return (e as { code?: string })?.code === 'declined' ? 'cancelled' : 'failed'
      }
    }
  }
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    return 'saved'
  } catch {
    return 'failed'
  }
}
