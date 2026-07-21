// ============================================================
// CONFIGURAÇÃO
// ============================================================

// Senha de acesso ao dashboard (definida como env var na Netlify)
export const DASH_PASSWORD = import.meta.env.VITE_DASH_PASSWORD || 'operacoes2026'

// Intervalo de atualização de preços ao vivo (ms)
export const PRICE_REFRESH_INTERVAL = 60_000 // 1 minuto

// ============================================================
// Mapeamento de tickers → IDs nas APIs de preço
// ============================================================

// CoinGecko IDs (cripto) — base fixa + dinâmico via localStorage
const COINGECKO_BASE = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  UNI: 'uniswap',
  INJ: 'injective-protocol',
  SUI: 'sui',
  ONDO: 'ondo-finance',
  NEAR: 'near',
  VIRTUAL: 'virtuals-protocol',
  ETHFI: 'ether-fi',
  PENDLE: 'pendle',
  HBAR: 'hedera-hashgraph',
  HYPE: 'hyperliquid',
  TAO: 'bittensor',
  VVV: 'venice-token',
  XMR: 'monero',
  ENA: 'ethena',
  SEI: 'sei-network',
  CC: 'canton-network',
  JTO: 'jito-governance-token',
  KAITO: 'kaito',
}

const CG_STORAGE_KEY = 'op-dash-coingecko-ids'

function loadDynamicIds() {
  try {
    return JSON.parse(localStorage.getItem(CG_STORAGE_KEY) || '{}')
  } catch { return {} }
}

/** Retorna mapa completo: base + IDs salvos dinamicamente */
export function getCoingeckoIds() {
  return { ...COINGECKO_BASE, ...loadDynamicIds() }
}

/** Salva um novo mapeamento ticker → coingecko_id */
export function saveCoingeckoId(ticker, id) {
  const dynamic = loadDynamicIds()
  dynamic[ticker.toUpperCase()] = id
  try { localStorage.setItem(CG_STORAGE_KEY, JSON.stringify(dynamic)) } catch { /* ignore */ }
}

// Manter export para compatibilidade, mas agora é dinâmico
export const COINGECKO_IDS = new Proxy(COINGECKO_BASE, {
  get(target, prop) {
    if (typeof prop === 'string') {
      return target[prop] || loadDynamicIds()[prop]
    }
    return target[prop]
  },
  has(target, prop) {
    return prop in target || prop in loadDynamicIds()
  },
})

// Tickers que são da B3 (bolsa brasileira) — Yahoo usa sufixo .SA
export const B3_TICKERS = ['B3SA3', 'PDTC3']
