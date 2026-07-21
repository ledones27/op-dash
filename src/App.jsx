import { useState, useMemo } from 'react'
import { useTradeData } from './hooks/useTradeData'
import LoginScreen from './components/LoginScreen'
import Layout from './components/Layout'
import Overview from './components/Overview'
import OpenPositions from './components/OpenPositions'
import EquityCurve from './components/EquityCurve'
import Watchlist from './components/Watchlist'
import TradeHistory from './components/TradeHistory'
import TradeForm from './components/TradeForm'
import SellForm from './components/SellForm'
import WatchlistForm from './components/WatchlistForm'
import AssetDetail from './components/AssetDetail'
import ConfirmDialog from './components/ConfirmDialog'
import { exportToExcel } from './services/exportService'
import { Loader2 } from 'lucide-react'

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => {
    // Verificar cookie de sessão (7 dias)
    return document.cookie.split(';').some(c => c.trim() === 'op_auth=1')
  })
  const [activeTab, setActiveTab] = useState('overview')
  const [hideValues, setHideValues] = useState(false)

  // Modais
  const [tradeFormOpen, setTradeFormOpen] = useState(false)
  const [editingTrade, setEditingTrade] = useState(null)
  const [sellFormOpen, setSellFormOpen] = useState(false)
  const [sellingTrade, setSellingTrade] = useState(null)
  const [watchlistFormOpen, setWatchlistFormOpen] = useState(false)
  const [editingWatch, setEditingWatch] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [viewingAsset, setViewingAsset] = useState(null)

  const ctx = useTradeData()

  const handleLogin = () => {
    // Cookie expira em 7 dias
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString()
    document.cookie = `op_auth=1; expires=${expires}; path=/; SameSite=Strict`
    setAuthenticated(true)
  }

  const handleLogout = () => {
    document.cookie = 'op_auth=1; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    setAuthenticated(false)
  }

  if (!authenticated) {
    return <LoginScreen onLogin={handleLogin} />
  }

  if (ctx.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent-gold mx-auto mb-3" />
          <p className="text-text-secondary text-sm">Carregando dados...</p>
        </div>
      </div>
    )
  }

  // ─── Handlers ───────────────────────────────────────────

  const handleNewTrade = () => {
    setEditingTrade(null)
    setTradeFormOpen(true)
  }

  const handleEditTrade = (trade) => {
    setEditingTrade(trade)
    setTradeFormOpen(true)
  }

  const handleSaveTrade = async (data) => {
    if (data.id) {
      await ctx.editTrade(data.id, data)
    } else {
      await ctx.addTrade(data)
    }
  }

  const handleSellTrade = (trade) => {
    setSellingTrade(trade)
    setSellFormOpen(true)
  }

  const handleConfirmSell = async (id, exitData) => {
    await ctx.editTrade(id, exitData)
  }

  const handleDeleteTrade = (trade) => {
    setDeleteConfirm({
      type: 'trade',
      id: trade.id,
      label: `${trade.ativo} (${trade.operacao}) — ${trade.dataEntrada}`,
    })
  }

  const handleDeleteWatch = (id, categoria, ativo) => {
    setDeleteConfirm({
      type: 'watchlist',
      id,
      categoria,
      label: ativo,
    })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return
    if (deleteConfirm.type === 'trade') {
      await ctx.removeTrade(deleteConfirm.id)
    } else {
      await ctx.removeWatch(deleteConfirm.id, deleteConfirm.categoria)
    }
    setDeleteConfirm(null)
  }

  // ─── Tabs ──────────────────────────────────────────────

  const handleViewAsset = (ticker) => setViewingAsset(ticker)

  const allTickers = useMemo(() => {
    const set = new Set()
    ctx.trades.forEach(t => t.ativo && set.add(t.ativo))
    if (ctx.watchlist) {
      Object.values(ctx.watchlist).forEach(items => items.forEach(i => i.ativo && set.add(i.ativo)))
    }
    return [...set].sort()
  }, [ctx.trades, ctx.watchlist])

  const renderTab = () => {
    if (viewingAsset) {
      return (
        <AssetDetail
          ticker={viewingAsset}
          trades={ctx.trades}
          prices={ctx.prices}
          onBack={() => setViewingAsset(null)}
        />
      )
    }

    switch (activeTab) {
      case 'overview':
        return <Overview resultados={ctx.resultados} openPositions={ctx.openPositions} prices={ctx.prices} />
      case 'positions':
        return (
          <OpenPositions
            trades={ctx.trades}
            prices={ctx.prices}
            onEdit={handleEditTrade}
            onDelete={handleDeleteTrade}
            onSell={handleSellTrade}
            onViewAsset={handleViewAsset}
          />
        )
      case 'equity':
        return <EquityCurve allTrades={ctx.trades} openPositions={ctx.openPositions} />
      case 'watchlist':
        return (
          <Watchlist
            watchlist={ctx.watchlist}
            onAdd={() => { setEditingWatch(null); setWatchlistFormOpen(true) }}
            onEdit={(item) => { setEditingWatch(item); setWatchlistFormOpen(true) }}
            onRemove={handleDeleteWatch}
          />
        )
      case 'history':
        return (
          <TradeHistory
            trades={ctx.trades}
            prices={ctx.prices}
            onEdit={handleEditTrade}
            onDelete={handleDeleteTrade}
            onNew={handleNewTrade}
            onExport={() => exportToExcel(ctx.trades, ctx.resultados, ctx.watchlist)}
            onViewAsset={handleViewAsset}
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      <Layout
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setViewingAsset(null) }}
        lastUpdate={ctx.lastUpdate}
        onRefresh={ctx.refreshPrices}
        onNewTrade={handleNewTrade}
        onLogout={handleLogout}
        hideValues={hideValues}
        onToggleHide={() => setHideValues(v => !v)}
        onViewAsset={handleViewAsset}
        allTickers={allTickers}
      >
        {renderTab()}
      </Layout>

      {/* Modais */}
      <TradeForm
        open={tradeFormOpen}
        onClose={() => { setTradeFormOpen(false); setEditingTrade(null) }}
        onSave={handleSaveTrade}
        editTrade={editingTrade}
      />

      <SellForm
        open={sellFormOpen}
        onClose={() => { setSellFormOpen(false); setSellingTrade(null) }}
        onSave={handleConfirmSell}
        trade={sellingTrade}
      />

      <WatchlistForm
        open={watchlistFormOpen}
        onClose={() => { setWatchlistFormOpen(false); setEditingWatch(null) }}
        onSave={async (data) => {
          if (data.id) {
            await ctx.editWatch(data.id, data.oldCategoria, data)
          } else {
            await ctx.addWatch(data)
          }
        }}
        editItem={editingWatch}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        title="Remover"
        message={`Tem certeza que quer remover ${deleteConfirm?.label}?`}
        destructive
      />
    </>
  )
}
