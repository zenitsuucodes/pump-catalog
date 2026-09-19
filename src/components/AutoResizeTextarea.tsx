import { useCallback, useEffect, useRef, type TextareaHTMLAttributes } from 'react'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  minRows?: number
  maxRows?: number
}

export function AutoResizeTextarea({
  minRows = 2,
  maxRows,
  value,
  onChange,
  className,
  ...props
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return

    el.style.height = '0px'
    const styles = getComputedStyle(el)
    const lineHeight = Number.parseFloat(styles.lineHeight) || 20
    const padding =
      Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom)
    const minHeight = lineHeight * minRows + padding

    let nextHeight = el.scrollHeight
    if (maxRows) {
      const maxHeight = lineHeight * maxRows + padding
      nextHeight = Math.min(nextHeight, maxHeight)
      el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
    } else {
      el.style.overflowY = 'hidden'
    }

    el.style.height = `${Math.max(nextHeight, minHeight)}px`
  }, [minRows, maxRows])

  useEffect(() => {
    resize()
  }, [value, resize])

  useEffect(() => {
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [resize])

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      className={className}
      onChange={(e) => {
        onChange?.(e)
        requestAnimationFrame(resize)
      }}
      {...props}
    />
  )
}
