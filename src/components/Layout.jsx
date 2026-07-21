import { useState, useRef, useMemo } from 'react'
import { RefreshCw, TrendingUp, BarChart3, Eye, EyeOff, List, Plus, LogOut, Search } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
  { id: 'positions', label: 'Posições Abertas', icon: TrendingUp },
  { id: 'watchlist', label: 'Watchlist', icon: Eye },
  { id: 'equity', label: 'Equity Curve', icon: TrendingUp },
  { id: 'history', label: 'Histórico', icon: List },
]

export default function Layout({ activeTab, onTabChange, lastUpdate, onRefresh, onNewTrade, onLogout, hideValues, onToggleHide, onViewAsset, allTickers, children }) {
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
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-gold/15 flex items-center justify-center">
                <span className="text-accent-gold font-bold text-sm">OP</span>
              </div>
              <h1 className="text-lg font-bold tracking-tight">Operações</h1>
              <div className="relative ml-2">
                {searchOpen ? (
                  <div className="relative">
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
                      className="w-40 sm:w-52 px-3 py-1.5 rounded-lg bg-bg-primary border border-border text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-gold transition-colors"
                      autoFocus
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 mt-1 w-full bg-bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
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
                  </div>
                ) : (
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="p-1.5 rounded-lg hover:bg-bg-hover transition-colors text-text-muted hover:text-text-primary"
                    title="Buscar ativo"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {lastUpdate && (
                <span className="text-xs text-text-muted hidden sm:block">
                  Preços: {lastUpdate.toLocaleTimeString('pt-BR')}
                </span>
              )}
              <button
                onClick={onLogout}
                className="p-2 rounded-lg hover:bg-accent-red/10 transition-colors text-text-muted hover:text-accent-red"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <button
                onClick={onToggleHide}
                className={`p-2 rounded-lg hover:bg-bg-hover transition-colors ${hideValues ? 'text-accent-gold' : 'text-text-secondary hover:text-text-primary'}`}
                title={hideValues ? 'Mostrar valores' : 'Esconder valores'}
              >
                {hideValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={onRefresh}
                className="p-2 rounded-lg hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary"
                title="Atualizar preços"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={onNewTrade}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-gold text-bg-primary text-sm font-semibold hover:bg-accent-gold/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo Trade</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Nav tabs */}
      <nav className="border-b border-border bg-bg-card/50 overflow-x-auto">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
          <div className="flex gap-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon
              const active = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    active
                      ? 'border-accent-gold text-accent-gold'
                      : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  )
}
