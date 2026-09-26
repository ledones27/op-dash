import { useState, useRef, useMemo } from 'react'
import { RefreshCw, TrendingUp, BarChart3, Eye, EyeOff, List, Plus, LogOut, Search, LineChart, Bitcoin } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'overview', label: 'Visão Geral', mobileLabel: 'Geral', icon: BarChart3 },
  { id: 'positions', label: 'Posições Abertas', mobileLabel: 'Abertas', icon: TrendingUp },
  { id: 'watchlist', label: 'Watchlist', mobileLabel: 'Watchlist', icon: Eye },
  { id: 'equity', label: 'Equity Curve', mobileLabel: 'Equity', icon: LineChart },
  { id: 'history', label: 'Histórico', mobileLabel: 'Histórico', icon: List },
  { id: 'bitcoin', label: 'Bitcoin', mobileLabel: 'Bitcoin', icon: Bitcoin },
]

export default function Layout({ activeTab, onTabChange, lastUpdate, onRefresh, refreshing, onNewTrade, onLogout, hideValues, onToggleHide, onViewAsset, allTickers, isGuest, children }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef(null)

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !allTickers) return []
    const q = searchQuery.toUpperCase().trim()
    return allTickers.filter(t => t.toUpperCase().includes(q)).slice(0, 8)
  }, [searchQuery, allTickers])

  const handleSearchSelect = (ticker) => {
    onViewAsset?.(ticker)
    setSearchOpen(false)
    setSearchQuery('')
  }
  return (
    <div className={`min-h-screen bg-bg-primary ${hideValues ? 'hide-values' : ''}`}>
      {/* Header */}
      <header className="border-b border-border bg-bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 sm:justify-start sm:gap-3">
            <img src="/logo1.webp" alt="OP" className="order-1 h-8 w-auto shrink-0" />
            <h1 className="order-2 text-lg font-bold tracking-tight hidden sm:block">Operações</h1>
            <button
              onClick={onLogout}
              className={`order-2 p-2 rounded-lg hover:bg-accent-red/10 transition-colors text-text-muted hover:text-accent-red sm:order-5 ${lastUpdate ? '' : 'sm:ml-auto'}`}
              title="Sair"
              aria-label="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <div className="relative order-3">
              <button
                onClick={() => setSearchOpen(true)}
                className={`p-1.5 rounded-lg hover:bg-bg-hover transition-colors ${searchOpen ? 'text-accent-gold' : 'text-text-muted hover:text-text-primary'} ${searchOpen ? 'sm:hidden' : ''}`}
                title="Buscar ativo"
                aria-label="Buscar ativo"
              >
                <Search className="w-4 h-4" />
              </button>
              {searchOpen && (
                <>
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery('') }
                      if (e.key === 'Enter' && searchResults.length > 0) handleSearchSelect(searchResults[0])
                    }}
                    onBlur={() => setTimeout(() => { setSearchOpen(false); setSearchQuery('') }, 200)}
                    placeholder="Buscar ativo..."
                    aria-label="Buscar ativo"
                    className="fixed left-4 right-4 top-14 z-50 w-auto px-3 py-1.5 rounded-lg bg-bg-primary border border-border text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-gold transition-colors sm:static sm:w-52"
                    autoFocus
                  />
                  {searchResults.length > 0 && (
                    <div className="fixed left-4 right-4 top-24 z-50 bg-bg-card border border-border rounded-lg shadow-lg overflow-hidden sm:absolute sm:left-0 sm:right-auto sm:top-full sm:mt-1 sm:w-full">
                      {searchResults.map(ticker => (
                        <button
                          key={ticker}
                          onMouseDown={() => handleSearchSelect(ticker)}
                          className="w-full text-left px-3 py-2 text-sm font-mono hover:bg-bg-hover transition-colors text-text-primary"
                        >
                          {ticker}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
            {lastUpdate && (
              <span className="order-4 ml-auto text-xs text-text-muted hidden sm:block">
                Preços: {lastUpdate.toLocaleTimeString('pt-BR')}
              </span>
            )}
            <button
              onClick={onToggleHide}
              className={`order-4 p-2 rounded-lg hover:bg-bg-hover transition-colors sm:order-6 ${hideValues ? 'text-accent-gold' : 'text-text-secondary hover:text-text-primary'}`}
              title={hideValues ? 'Mostrar valores' : 'Esconder valores'}
              aria-label={hideValues ? 'Mostrar valores' : 'Esconder valores'}
            >
              {hideValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="order-5 p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary disabled:opacity-50 sm:order-7"
              title="Atualizar preços"
              aria-label="Atualizar preços"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {isGuest ? (
              <span className="order-6 px-2 py-1.5 rounded-lg bg-bg-hover text-text-muted text-[10px] font-medium sm:order-8 sm:px-3 sm:text-xs">
                Convidado
              </span>
            ) : (
              <button
                onClick={onNewTrade}
                aria-label="Novo Trade"
                className="order-6 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-gold text-bg-primary text-sm font-semibold hover:bg-accent-gold/90 transition-colors sm:order-8"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo Trade</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Nav tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-card/95 backdrop-blur-sm sm:static sm:border-t-0 sm:border-b sm:bg-bg-card/50 sm:backdrop-blur-none" aria-label="Páginas">
        <div className="max-w-[1440px] mx-auto px-1 sm:px-6" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="grid grid-cols-6 sm:flex sm:gap-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon
              const active = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={`min-w-0 flex flex-col items-center justify-center gap-1 px-0.5 py-2 text-[10px] font-medium whitespace-nowrap border-b-2 transition-colors sm:flex-row sm:gap-2 sm:px-4 sm:py-3 sm:text-sm ${
                    active
                      ? 'border-accent-gold text-accent-gold'
                      : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="sm:hidden">{item.mobileLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-[1440px] mx-auto px-4 pt-6 pb-28 sm:px-6 sm:py-6">
        {children}
      </main>
    </div>
  )
}
