type Props = {
  symbol: string | null
  name: string | null
  onCancel: () => void
  onConfirm: () => void
  deleting?: boolean
}

export function DeleteWarningModal({ symbol, name, onCancel, onConfirm, deleting }: Props) {
  const label = coinLabel(symbol, name)

  return (
    <div className="overlay" onClick={onCancel} role="presentation">
      <div
        className="modal delete-warning-modal"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal
        aria-labelledby="delete-warning-title"
      >
        <div className="delete-warning-icon" aria-hidden>
          ⚠
        </div>
        <h2 id="delete-warning-title">Remove this token?</h2>
        <p className="modal-sub">
          You&apos;re about to delete <strong>{label}</strong> from your catalog. Your tweet text
          and thoughts will be permanently removed and cannot be recovered.
        </p>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger-solid" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Removing…' : 'Yes, remove token'}
          </button>
        </div>
      </div>
    </div>
  )
}

function coinLabel(symbol: string | null, name: string | null) {
  if (symbol && name) return `$${symbol} (${name})`
  if (symbol) return `$${symbol}`
  if (name) return name
  return 'this token'
}
