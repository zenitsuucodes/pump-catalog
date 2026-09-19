import { useEffect, useMemo, useState } from 'react'
import { imageDisplayCandidates } from '../utils/images'

type Props = {
  uri: string | null | undefined
  symbol: string | null | undefined
  className?: string
}

export function CoinImage({ uri, symbol, className = 'token-hero-img' }: Props) {
  const candidates = useMemo(() => imageDisplayCandidates(uri), [uri])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [uri, candidates])

  const fallback = (symbol || '?').slice(0, 3)
  const exhausted = index >= candidates.length
  const src = exhausted ? null : candidates[index]

  if (!src) {
    return <div className={`${className} placeholder`}>{fallback}</div>
  }

  return (
    <img
      className={className}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setIndex((current) => current + 1)}
    />
  )
}
