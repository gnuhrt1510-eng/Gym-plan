import { useEffect, useState, type ReactNode } from 'react'

/**
 * Nút cần bấm 2 lần để xác nhận — thay cho confirm() (bị chặn trong một số trình xem/webview).
 * Nếu `skip` = true thì chạy luôn ở lần bấm đầu.
 */
export default function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  className = 'btn',
  skip = false,
  ariaLabel,
}: {
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  className?: string
  skip?: boolean
  ariaLabel?: string
}) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3500)
    return () => clearTimeout(t)
  }, [armed])

  return (
    <button
      className={`${className} ${armed ? 'armed' : ''}`}
      aria-label={armed ? confirmLabel : ariaLabel}
      onClick={() => {
        if (skip || armed) {
          setArmed(false)
          onConfirm()
        } else setArmed(true)
      }}
    >
      {armed ? confirmLabel : children}
    </button>
  )
}
