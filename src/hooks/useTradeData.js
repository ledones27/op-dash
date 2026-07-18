import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchAllTrades, createTrade, updateTrade, deleteTrade, fetchWatchlist, addToWatchlist, updateWatchlistItem, removeFromWatchlist } from '../services/tradeService'
import { fetchLivePrices } from '../services/priceService'
import { PRICE_REFRESH_INTERVAL } from '../config'

export function useTradeData() {
  const [trades, setTrades] = useState([])
  const [watchlist, setWatchlist] = useState({})
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  // ─── Load ──────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    try {
      const [t, w] = await Promise.all([fetchAllTrades(), fetchWatchlist()])
      setTrades(t)
      setWatchlist(w)
      return t
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      return []
    }
  }, [])

  const refreshPrices = useCallback(async (tradeList) => {
    const open = (tradeList || trades).filter(t => t.status === 'Aberta')
    if (open.length === 0) return

    try {
      const newPrices = await fetchLivePrices(open)
      setPrices(prev => ({ ...prev, ...newPrices }))
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Erro ao buscar preços:', err)
    }
  }, [trades])

  // Initial load
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const t = await loadAll()
        if (mounted) {
          await refreshPrices(t)
        }
      } catch (err) {
        console.error('Erro no load inicial:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, []) // eslint-disable-line

  // Price refresh interval
  useEffect(() => {
    if (trades.length === 0) return
    const interval = setInterval(() => refreshPrices(), PRICE_REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [trades, refreshPrices])

  // ─── CRUD Trades ───────────────────────────────────────

  const addTrade = useCallback(async (trade) => {
    const created = await createTrade(trade)
    setTrades(prev => {
      const next = [...prev, created]
      // Refresh imediato para buscar preço do novo ticker
      setTimeout(() => refreshPrices(next), 100)
      return next
    })
    return created
  }, [refreshPrices])

  const editTrade = useCallback(async (id, updates) => {
    const updated = await updateTrade(id, updates)
    setTrades(prev => {
      const next = prev.map(t => t.id === id ? updated : t)
      // Refresh imediato — ticker pode ter mudado
      setTimeout(() => refreshPrices(next), 100)
      return next
    })
    return updated
  }, [refreshPrices])

  const removeTrade = useCallback(async (id) => {
    await deleteTrade(id)
    setTrades(prev => prev.filter(t => t.id !== id))
  }, [])

  // ─── CRUD Watchlist ────────────────────────────────────

  const addWatch = useCallback(async (item) => {
    const created = await addToWatchlist(item)
    setWatchlist(prev => ({
      ...prev,
      [item.categoria]: [...(prev[item.categoria] || []), {
        id: created.id,
        ativo: created.ativo,
        operacao: created.operacao,
      }],
    }))
  }, [])

  const editWatch = useCallback(async (id, oldCategoria, updates) => {
    const updated = await updateWatchlistItem(id, updates)
    setWatchlist(prev => {
      const next = { ...prev }
      // Remove da categoria antiga
      next[oldCategoria] = (next[oldCategoria] || []).filter(w => w.id !== id)
      // Adiciona na categoria (pode ter mudado)
      const cat = updates.categoria || oldCategoria
      next[cat] = [...(next[cat] || []), {
        id: updated.id,
        ativo: updated.ativo,
        operacao: updated.operacao,
      }]
      return next
    })
  }, [])

  const removeWatch = useCallback(async (id, categoria) => {
    await removeFromWatchlist(id)
    setWatchlist(prev => ({
      ...prev,
      [categoria]: (prev[categoria] || []).filter(w => w.id !== id),
    }))
  }, [])

  // ─── Derived data ─────────────────────────────────────

  const tradesByCategory = useMemo(() => {
    const grouped = { 'Ações': [], 'Cripto': [], 'Commodities': [], 'Índices': [] }
    for (const t of trades) {
      if (grouped[t.categoria]) grouped[t.categoria].push(t)
    }
    return grouped
  }, [trades])

  const openPositions = useMemo(() => trades.filter(t => t.status === 'Aberta'), [trades])
  const closedTrades = useMemo(() => trades.filter(t => t.status === 'Fechada'), [trades])

  // Calcula resultados por categoria
  const resultados = useMemo(() => {
    const cats = ['Ações', 'Cripto', 'Commodities', 'Índices']
    const rows = []

    for (const cat of cats) {
      const catTrades = tradesByCategory[cat] || []
      const closed = catTrades.filter(t => t.status === 'Fechada')
      const open = catTrades.filter(t => t.status === 'Aberta')

      const wins = closed.filter(t => (t.resultado ?? 0) > 0)
      const losses = closed.filter(t => (t.resultado ?? 0) <= 0)

      const avgWin = wins.length > 0
        ? wins.reduce((s, t) => s + (t.pnlPercent || 0), 0) / wins.length
        : null
      const avgLoss = losses.length > 0
        ? losses.reduce((s, t) => s + (t.pnlPercent || 0), 0) / losses.length
        : null

      const totalWin = wins.reduce((s, t) => s + (t.resultado || 0), 0)
      const totalLoss = Math.abs(losses.reduce((s, t) => s + (t.resultado || 0), 0))

      const resultadoTotal = closed.reduce((s, t) => s + (t.resultado || 0), 0)
      const capitalAlocado = catTrades.reduce((s, t) => s + (t.aporte || 0), 0)
      const capitalFechado = closed.reduce((s, t) => s + (t.aporte || 0), 0)
      const duracaoMedia = closed.length > 0
        ? closed.reduce((s, t) => s + (t.duracao || 0), 0) / closed.length
        : null

      rows.push({
        categoria: cat,
        tradesFechados: closed.length,
        tradesAbertos: open.length,
        vitorias: wins.length,
        derrotas: losses.length,
        winRate: closed.length > 0 ? wins.length / closed.length : null,
        mediaGanho: avgWin,
        mediaPerda: avgLoss,
        payoffRatio: avgWin && avgLoss ? Math.abs(avgWin / avgLoss) : null,
        profitFactor: totalLoss > 0 ? totalWin / totalLoss : null,
        resultadoTotal,
        capitalAlocado,
        roi: capitalFechado > 0 ? resultadoTotal / capitalFechado : null,
        expectancia: closed.length > 0 ? resultadoTotal / closed.length : null,
        duracaoMedia,
      })
    }

    // Linha TOTAL
    const allWins = closedTrades.filter(t => (t.resultado ?? 0) > 0)
    const allLosses = closedTrades.filter(t => (t.resultado ?? 0) <= 0)

    const totalWinAmt = allWins.reduce((s, t) => s + (t.resultado || 0), 0)
    const totalLossAmt = Math.abs(allLosses.reduce((s, t) => s + (t.resultado || 0), 0))
    const totalResult = closedTrades.reduce((s, t) => s + (t.resultado || 0), 0)
    const totalCapital = trades.reduce((s, t) => s + (t.aporte || 0), 0)
    const totalCapitalClosed = closedTrades.reduce((s, t) => s + (t.aporte || 0), 0)

    rows.push({
      categoria: 'TOTAL',
      tradesFechados: closedTrades.length,
      tradesAbertos: openPositions.length,
      vitorias: allWins.length,
      derrotas: allLosses.length,
      winRate: closedTrades.length > 0 ? allWins.length / closedTrades.length : null,
      mediaGanho: allWins.length > 0 ? allWins.reduce((s, t) => s + (t.pnlPercent || 0), 0) / allWins.length : null,
      mediaPerda: allLosses.length > 0 ? allLosses.reduce((s, t) => s + (t.pnlPercent || 0), 0) / allLosses.length : null,
      payoffRatio: null,
      profitFactor: totalLossAmt > 0 ? totalWinAmt / totalLossAmt : null,
      resultadoTotal: totalResult,
      capitalAlocado: totalCapital,
      roi: totalCapitalClosed > 0 ? totalResult / totalCapitalClosed : null,
      expectancia: closedTrades.length > 0 ? totalResult / closedTrades.length : null,
      duracaoMedia: closedTrades.length > 0 ? closedTrades.reduce((s, t) => s + (t.duracao || 0), 0) / closedTrades.length : null,
    })

    return rows
  }, [trades, closedTrades, openPositions, tradesByCategory])

  return {
    trades,
    tradesByCategory,
    watchlist,
    prices,
    loading,
    lastUpdate,
    openPositions,
    closedTrades,
    resultados,
    addTrade,
    editTrade,
    removeTrade,
    addWatch,
    editWatch,
    removeWatch,
    refreshPrices: () => refreshPrices(),
    reloadAll: async () => {
      setLoading(true)
      try {
        const t = await loadAll()
        await refreshPrices(t)
      } finally {
        setLoading(false)
      }
    },
  }
}
