import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle: string
  loading: boolean
  loadingMessage?: string
  emptyMessage: string
  count: number
  children: ReactNode
}

export function CardGrid({
  title,
  subtitle,
  loading,
  loadingMessage = 'Loading…',
  emptyMessage,
  count,
  children,
}: Props) {
  if (loading) {
    return (
      <div className="catalog-page">
        <div className="empty-state">
          <h3>{loadingMessage}</h3>
        </div>
      </div>
    )
  }

  return (
    <div className="catalog-page">
      <div className="page-heading">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      {count === 0 ? (
        <div className="empty-state compact">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="card-grid">{children}</div>
      )}
    </div>
  )
}
