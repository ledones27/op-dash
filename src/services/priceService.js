import { getCoingeckoIds, B3_TICKERS } from '../config'

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

/**
 * Busca preços ao vivo para uma lista de posições abertas.
 * Retorna { TICKER: price }
 */
export async function fetchLivePrices(openPositions) {
  const prices = {}

  // Classificar tickers por API (lê mapa dinâmico a cada chamada)
  const cgIds = getCoingeckoIds()
  const cryptoTickers = []
  const yahooTickers = [] // tudo que não é cripto vai pro Yahoo

  for (const pos of openPositions) {
    const t = pos.ativo
    if (cgIds[t]) {
      cryptoTickers.push(t)
    } else {
      yahooTickers.push(t)
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

// ─── CoinGecko (Cripto) ─────────────────────────────────

async function fetchCrypto(tickers) {
  const cgIds = getCoingeckoIds()
  const ids = tickers.map(t => cgIds[t]).filter(Boolean).join(',')
  if (!ids) return {}

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
    )
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
    const data = await res.json()

    const prices = {}
    for (const ticker of tickers) {
      const id = cgIds[ticker]
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
  // Mapeamentos especiais (commodities, índices)
  if (YAHOO_TICKERS[ticker]) return YAHOO_TICKERS[ticker]
  // Ações B3 (sufixo .SA)
  if (B3_TICKERS.includes(ticker)) return `${ticker}.SA`
  // Ações US (ticker direto)
  return ticker
}

async function fetchYahoo(tickers) {
  const prices = {}

  // Yahoo permite buscar vários tickers de uma vez com o endpoint de quote
  // Vamos buscar em lotes de 10 pra não sobrecarregar
  const batchSize = 10
  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize)

    // Buscar cada ticker individualmente via chart API (mais confiável)
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
