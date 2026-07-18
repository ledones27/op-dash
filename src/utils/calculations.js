/**
 * Calcula PnL não-realizado para uma posição aberta.
 */
export function calcUnrealizedPnl(trade, currentPrice) {
  if (!currentPrice || !trade.precoEntrada) return null

  const entry = trade.precoEntrada
  const current = currentPrice

  if (trade.operacao === 'LONG') {
    return ((current - entry) / entry)
  } else {
    return ((entry - current) / entry)
  }
}

/**
 * Calcula resultado em $ do PnL não-realizado.
 */
export function calcUnrealizedResult(trade, currentPrice) {
  const pnl = calcUnrealizedPnl(trade, currentPrice)
  if (pnl === null || !trade.aporte) return null
  return pnl * trade.aporte
}

/**
 * Gera dados para equity curve (resultado acumulado ao longo do tempo).
 */
export function buildEquityCurve(allTrades) {
  const closed = allTrades
    .filter(t => t.status === 'Fechada' && t.dataSaida && t.resultado != null)
    .sort((a, b) => a.dataSaida.localeCompare(b.dataSaida))

  let cumulative = 0
  return closed.map(t => {
    cumulative += t.resultado
    return {
      date: t.dataSaida,
      resultado: t.resultado,
      acumulado: Math.round(cumulative * 100) / 100,
      ativo: t.ativo,
    }
  })
}

/**
 * Calcula capital alocado ao longo do tempo (snapshot diário).
 */
export function buildCapitalTimeline(allTrades) {
  // Gera eventos de entrada e saída
  const events = []
  for (const t of allTrades) {
    if (!t.dataEntrada || !t.aporte) continue
    events.push({ date: t.dataEntrada, delta: t.aporte, type: 'open' })
    if (t.dataSaida) {
      events.push({ date: t.dataSaida, delta: -t.aporte, type: 'close' })
    }
  }
  events.sort((a, b) => a.date.localeCompare(b.date))

  let capital = 0
  let maxCapital = 0
  const timeline = []

  for (const e of events) {
    capital += e.delta
    if (capital > maxCapital) maxCapital = capital
    timeline.push({
      date: e.date,
      capital: Math.round(capital * 100) / 100,
      maxCapital: Math.round(maxCapital * 100) / 100,
    })
  }

  return { timeline, peakCapital: maxCapital }
}

/**
 * Formata número como moeda USD.
 */
export function fmtUSD(value) {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Formata percentual.
 */
export function fmtPct(value) {
  if (value == null) return '—'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(2)}%`
}

/**
 * Formata preço com precisão adequada.
 */
export function fmtPrice(value) {
  if (value == null) return '—'
  if (value < 1) return value.toFixed(4)
  if (value < 100) return value.toFixed(2)
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
