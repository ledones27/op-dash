import { getCoingeckoIds, saveCoingeckoId, B3_TICKERS } from '../config'

// Yahoo Finance ticker mapping
const YAHOO_TICKERS = {
  // Commodities
  GOLD: 'GC=F',
  SILVER: 'SI=F',
  UKOIL: 'BZ=F',
  // Índices
  NASDAQ: '^IXIC',
  SP: '^GSPC',
}

// Cache de IDs já resolvidos nesta sessão (evita buscas repetidas)
const resolvedIds = {}
// Tickers que já tentamos resolver e falharam (evita retry infinito)
const failedLookups = new Set()

/**
 * Busca preços ao vivo para uma lista de posições abertas.
 * Retorna { TICKER: price }
 */
export async function fetchLivePrices(openPositions) {
  const prices = {}

  // Classificar tickers por API (lê mapa dinâmico a cada chamada)
  const cgIds = getCoingeckoIds()
  const cryptoTickers = []
  const yahooTickers = []
  const unknownCrypto = [] // cripto sem ID no mapa

  for (const pos of openPositions) {
    const t = pos.ativo
    if (cgIds[t] || resolvedIds[t]) {
      cryptoTickers.push(t)
    } else if (pos.categoria === 'Cripto' && !failedLookups.has(t)) {
      // É cripto mas não tem ID — precisa resolver
      unknownCrypto.push(t)
    } else if (pos.categoria !== 'Cripto') {
      yahooTickers.push(t)
    }
  }

  // Resolver IDs desconhecidos de cripto via CoinGecko Search
  if (unknownCrypto.length > 0) {
    await resolveUnknownCrypto(unknownCrypto)
    // Após resolver, mover os que foram encontrados para cryptoTickers
    for (const t of unknownCrypto) {
      if (resolvedIds[t]) {
        cryptoTickers.push(t)
      }
    }
  }

  // Fetch em paralelo
  const results = await Promise.allSettled([
    cryptoTickers.length > 0 ? fetchCrypto(cryptoTickers) : {},
    yahooTickers.length > 0 ? fetchYahoo(yahooTickers) : {},
  ])

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      Object.assign(prices, r.value)
    }
  }

  return prices
}

// ─── Auto-resolver IDs de cripto desconhecidos ─────────

async function resolveUnknownCrypto(tickers) {
  for (const ticker of tickers) {
    try {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(ticker)}`
      )
      if (!res.ok) {
        console.warn(`[priceService] CoinGecko search failed for ${ticker}: ${res.status}`)
        failedLookups.add(ticker)
        continue
      }
      const data = await res.json()
      const coins = data?.coins || []

      // Buscar match exato por símbolo (case-insensitive)
      const match = coins.find(c => c.symbol?.toUpperCase() === ticker.toUpperCase())

      if (match) {
        console.log(`[priceService] Auto-resolved ${ticker} → ${match.id} (${match.name})`)
        resolvedIds[ticker] = match.id
        // Salvar no localStorage pra persistir
        saveCoingeckoId(ticker, match.id)
      } else {
        console.warn(`[priceService] No CoinGecko match for symbol: ${ticker}`)
        failedLookups.add(ticker)
      }
    } catch (err) {
      console.warn(`[priceService] CoinGecko search error for ${ticker}:`, err.message)
      failedLookups.add(ticker)
    }
  }
}

// ─── CoinGecko (Cripto) ─────────────────────────────────

async function fetchCrypto(tickers) {
  const cgIds = getCoingeckoIds()
  const allIds = { ...cgIds, ...resolvedIds }
  const ids = tickers.map(t => allIds[t]).filter(Boolean).join(',')
  if (!ids) return {}

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
    )
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
    const data = await res.json()

    const prices = {}
    for (const ticker of tickers) {
      const id = allIds[ticker]
      if (data[id]?.usd) {
        prices[ticker] = data[id].usd
      }
    }
    return prices
  } catch (err) {
    console.error('[priceService] CoinGecko error:', err)
    return {}
  }
}

// ─── Yahoo Finance (Ações, Commodities, Índices) ────────

function toYahooSymbol(ticker) {
  if (YAHOO_TICKERS[ticker]) return YAHOO_TICKERS[ticker]
  if (B3_TICKERS.includes(ticker)) return `${ticker}.SA`
  return ticker
}

async function fetchYahoo(tickers) {
  const prices = {}
  const batchSize = 10

  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize)

    const promises = batch.map(async (ticker) => {
      const yahooSymbol = toYahooSymbol(ticker)
      try {
        const res = await fetch(
          `/api/yahoo/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`
        )
        if (!res.ok) throw new Error(`Yahoo ${res.status}`)
        const data = await res.json()

        const meta = data?.chart?.result?.[0]?.meta
        if (meta?.regularMarketPrice) {
          prices[ticker] = meta.regularMarketPrice
        }
      } catch (err) {
        console.warn(`[priceService] Yahoo error for ${ticker}:`, err.message)
      }
    })

    await Promise.allSettled(promises)
  }

  return prices
}
