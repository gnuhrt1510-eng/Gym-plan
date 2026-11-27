import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 22, children, ...rest }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  )
}

export const IconDumbbell = (p: P) => (
  <Svg {...p}>
    <path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11" />
  </Svg>
)
export const IconChart = (p: P) => (
  <Svg {...p}>
    <path d="M4 20h16M7 16v-5M12 16V6M17 16v-8" />
  </Svg>
)
export const IconBowl = (p: P) => (
  <Svg {...p}>
    <path d="M3 11h18a9 9 0 0 1-18 0Z" />
    <path d="M9 7.5c0-1.5 1.2-2 1.2-3.5M13.5 7.5c0-1.5 1.2-2 1.2-3.5" />
  </Svg>
)
export const IconSliders = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Svg>
)
export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
)
export const IconPlay = (p: P) => (
  <Svg {...p}>
    <path d="M7 5v14l12-7Z" fill="currentColor" />
  </Svg>
)
export const IconArrowUp = (p: P) => (
  <Svg {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Svg>
)
export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
)
export const IconChevron = (p: P) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
)
export const IconBolt = (p: P) => (
  <Svg {...p}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7Z" fill="currentColor" stroke="none" />
  </Svg>
)
export const IconLayers = (p: P) => (
  <Svg {...p}>
    <path d="M12 3 3 8l9 5 9-5Z M3 13l9 5 9-5" />
  </Svg>
)
export const IconRun = (p: P) => (
  <Svg {...p}>
    <circle cx="14" cy="4.5" r="1.8" />
    <path d="M9 20l2.5-5 3 2.5V22M6 12l3-3.5 4 1 2.5 3.5H19M11.5 15l1.5-5.5" />
  </Svg>
)
