import {
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

type Props = {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom'
  /** Optional wider tooltip for longer copy. */
  wide?: boolean
}

export function Tooltip({
  content,
  children,
  side = 'top',
  wide = false,
}: Props) {
  const tipId = useId()
  const [open, setOpen] = useState(false)

  const style = {
    '--tip-side': side === 'bottom' ? 'calc(100% + 0.35rem)' : 'auto',
    '--tip-bottom': side === 'top' ? 'calc(100% + 0.35rem)' : 'auto',
  } as CSSProperties

  return (
    <span
      className={`ui-tooltip${open ? ' is-open' : ''}${wide ? ' is-wide' : ''}`}
      style={style}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false)
      }}
    >
      {children}
      <span className="ui-tooltip-bubble" id={tipId} role="tooltip">
        {content}
      </span>
    </span>
  )
}
