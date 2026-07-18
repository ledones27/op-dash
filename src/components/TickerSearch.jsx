import { useState, useEffect, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'
import AssetLogo, { saveAssetName } from './AssetLogo'
import { saveCoingeckoId } from '../config'

// Índices populares pré-definidos (fallback + suplemento à busca Yahoo)
const COMMON_INDICES = [
  { symbol: '^BVSP',  name: 'Ibovespa',   type: 'INDEX', exchange: 'SAO' },
  { symbol: '^GSPC',  name: 'S&P 500',    type: 'INDEX', exchange: 'SNP' },
  { symbol: '^IXIC',  name: 'Nasdaq',      type: 'INDEX', exchange: 'NAS' },
  { symbol: '^DJI',   name: 'Dow Jones',   type: 'INDEX', exchange: 'DJI' },
  { symbol: '^GDAXI', name: 'DAX',         type: 'INDEX', exchange: 'GER' },
  { symbol: '^FTSE',  name: 'FTSE 100',    type: 'INDEX', exchange: 'LON' },
  { symbol: '^N225',  name: 'Nikkei 225',  type: 'INDEX', exchange: 'TYO' },
]

/**
 * Input com autocomplete para buscar tickers.
 * - Ações / Commodities / Índices → Yahoo Finance search
 * - Cripto → CoinGecko search
 */
export default function TickerSearch({ value, onChange, categoria, autoFocus }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timerRef = useRef(null)
  const containerRef = useRef(null)

  // Sync external value changes
  useEffect(() => {
    setQuery(value || '')
  }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const searchYahoo = async (q) => {
    try {
      const res = await fetch(`/api/yahoo/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`)
      if (!res.ok) return []
      const data = await res.json()
      return (data.quotes || [])
        .filter(item => item.symbol && item.shortname)
        .map(item => ({
          // Mantém o símbolo original para índices (ex: ^BVSP), remove .SA para ações BR
          symbol: item.quoteType === 'INDEX' ? item.symbol : item.symbol.replace('.SA', ''),
          name: item.shortname,
          type: item.quoteType || '',
          exchange: item.exchange || '',
        }))
    } catch {
      return []
    }
  }

  const searchCoinGecko = async (q) => {
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`)
      if (!res.ok) return []
      const data = await res.json()
      return (data.coins || [])
        .slice(0, 8)
        .map(coin => ({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          type: 'CRYPTO',
          exchange: `#${coin.market_cap_rank || '—'}`,
          thumb: coin.thumb || null,
          coingeckoId: coin.id,
        }))
    } catch {
      return []
    }
  }

  const doSearch = async (q) => {
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    setLoading(true)
    try {
      let items
      if (categoria === 'Cripto') {
        items = await searchCoinGecko(q)
      } else if (categoria === 'Índices') {
        // Filtra índices pré-definidos que batem com a busca
        const qUp = q.toUpperCase()
        const predefined = COMMON_INDICES.filter(idx =>
          idx.symbol.toUpperCase().includes(qUp) ||
          idx.name.toUpperCase().includes(qUp)
        )
        // Busca Yahoo e prioriza resultados do tipo INDEX
        const yahoo = await searchYahoo(q)
        const indexResults = yahoo.filter(r => r.type === 'INDEX')
        const otherResults = yahoo.filter(r => r.type !== 'INDEX')
        // Mescla: pré-definidos primeiro, depois Yahoo INDEX, depois outros
        const seen = new Set()
        items = []
        for (const list of [predefined, indexResults, otherResults]) {
          for (const item of list) {
            if (!seen.has(item.symbol)) {
              seen.add(item.symbol)
              items.push(item)
            }
          }
        }
        items = items.slice(0, 10)
      } else {
        items = await searchYahoo(q)
      }
      setResults(items)
      setOpen(items.length > 0)
    } finally {
      setLoading(false)
    }
  }

  const handleInput = (e) => {
    const val = e.target.value
    setQuery(val)
    onChange(val.toUpperCase().trim())

    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(val), 400)
  }

  const handleSelect = (item) => {
    setQuery(item.symbol)
    onChange(item.symbol)
    // Salvar mapeamento CoinGecko automaticamente
    if (item.coingeckoId) {
      saveCoingeckoId(item.symbol, item.coingeckoId)
    }
    // Salvar nome do ativo
    if (item.name) {
      saveAssetName(item.symbol, item.name)
    }
    setOpen(false)
    setResults([])
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="ex: GOLD, BTC, AAPL"
          autoFocus={autoFocus}
          className="w-full px-3 py-2.5 pr-9 rounded-lg bg-bg-primary border border-border text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-gold transition-colors text-sm"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading
            ? <Loader2 className="w-4 h-4 text-accent-gold animate-spin" />
            : <Search className="w-4 h-4 text-text-muted" />
          }
        </div>
      </div>

      {/* Dropdown de resultados */}
      {open && (
        <div className="absolute z-[9999] left-0 right-0 mt-1 bg-bg-card border border-border rounded-lg shadow-2xl max-h-60 overflow-y-auto">
          {results.map((item, i) => (
            <button
              key={`${item.symbol}-${i}`}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-bg-hover transition-colors text-left border-b border-border/50 last:border-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {item.thumb ? (
                  <img src={item.thumb} alt="" className="w-5 h-5 rounded-full shrink-0" />
                ) : (
                  <AssetLogo ticker={item.symbol} categoria={categoria} size={20} />
                )}
                <span className="font-mono font-bold text-sm text-accent-gold shrink-0">
                  {item.symbol}
                </span>
                <span className="text-xs text-text-secondary truncate">
                  {item.name}
                </span>
              </div>
              <span className="text-[10px] text-text-muted shrink-0 ml-2">
                {item.exchange}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
