import { SOL_MINT, TRACKED_WALLET, USDC_MINT } from './config.js'

const IGNORED_MINTS = new Set([SOL_MINT, USDC_MINT])

function isTrackedWallet(address) {
  return address === TRACKED_WALLET
}

function isTradeMint(mint) {
  return mint && !IGNORED_MINTS.has(mint) && mint.length >= 32
}

function parseNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

function collectTokenTransfers(tx) {
  const transfers = []

  if (Array.isArray(tx.tokenTransfers)) {
    for (const transfer of tx.tokenTransfers) {
      transfers.push({
        mint: transfer.mint,
        from: transfer.fromUserAccount || transfer.fromTokenAccount,
        to: transfer.toUserAccount || transfer.toTokenAccount,
        amount: parseNumber(transfer.tokenAmount ?? transfer.amount),
      })
    }
  }

  if (Array.isArray(tx.accountData)) {
    for (const account of tx.accountData) {
      if (!Array.isArray(account.tokenBalanceChanges)) continue
      for (const change of account.tokenBalanceChanges) {
        transfers.push({
          mint: change.mint,
          from: parseNumber(change.rawTokenAmount?.tokenAmount ?? change.tokenAmount) < 0 ? account.account : null,
          to: parseNumber(change.rawTokenAmount?.tokenAmount ?? change.tokenAmount) > 0 ? account.account : null,
          amount: Math.abs(parseNumber(change.rawTokenAmount?.tokenAmount ?? change.tokenAmount)),
          userAccount: account.account,
          delta: parseNumber(change.rawTokenAmount?.tokenAmount ?? change.tokenAmount),
        })
      }
    }
  }

  return transfers
}

function collectNativeDelta(tx) {
  if (!Array.isArray(tx.accountData)) return 0
  for (const account of tx.accountData) {
    if (account.account === TRACKED_WALLET) {
      return parseNumber(account.nativeBalanceChange) / 1_000_000_000
    }
  }
  return 0
}

export function extractWalletTradeEvents(tx) {
  const signature = tx.signature || tx.transactionSignature
  if (!signature) return []

  const transfers = collectTokenTransfers(tx)
  const events = []
  const solDelta = collectNativeDelta(tx)

  for (const transfer of transfers) {
    if (!isTradeMint(transfer.mint)) continue

    const sold =
      transfer.from === TRACKED_WALLET ||
      (transfer.userAccount === TRACKED_WALLET && transfer.delta < 0)
    const bought =
      transfer.to === TRACKED_WALLET ||
      (transfer.userAccount === TRACKED_WALLET && transfer.delta > 0)

    if (sold) {
      events.push({
        signature,
        side: 'sell',
        mint: transfer.mint,
        tokenAmount: transfer.amount || Math.abs(transfer.delta || 0),
        solDelta,
        timestamp: tx.timestamp || tx.blockTime || null,
      })
    } else if (bought) {
      events.push({
        signature,
        side: 'buy',
        mint: transfer.mint,
        tokenAmount: transfer.amount || Math.abs(transfer.delta || 0),
        solDelta,
        timestamp: tx.timestamp || tx.blockTime || null,
      })
    }
  }

  return events
}

export function extractWalletTradeEventsFromPayload(payload) {
  const txs = Array.isArray(payload) ? payload : payload?.transactions || payload?.events || [payload]
  const events = []

  for (const tx of txs) {
    if (!tx || typeof tx !== 'object') continue
    events.push(...extractWalletTradeEvents(tx))
  }

  return events
}
