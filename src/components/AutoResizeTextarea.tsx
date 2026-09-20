import { useCallback, useEffect, useRef, type TextareaHTMLAttributes } from 'react'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  minRows?: number
  maxRows?: number
}

function isMeasurable(el: HTMLElement) {
  return el.getClientRects().length > 0
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
  const pendingRef = useRef(false)

  const resize = useCallback(() => {
    const el = ref.current
    if (!el) return

    if (!isMeasurable(el)) {
      pendingRef.current = true
      return
    }

    pendingRef.current = false

    el.style.height = 'auto'
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
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          requestAnimationFrame(resize)
        }
      },
      { threshold: 0 },
    )

    observer.observe(el)

    const onResize = () => resize()
    window.addEventListener('resize', onResize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', onResize)
    }
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
