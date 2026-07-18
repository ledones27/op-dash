import { useState, useEffect } from 'react'

/**
 * Logo do ativo com imagem real + cadeia de fallback.
 *
 * Cripto  → CoinCap CDN (direto, sem API)
 * Stocks  → Finnhub (logo HD, 60 req/min) → IconHorse → iniciais
 *
 * Cache persistente no localStorage:
 *   ticker → logoUrl (Finnhub) OU ticker → domain (fallback)
 * Após o primeiro load, nunca mais chama API para aquele ticker.
 */

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_KEY || ''
const STORAGE_KEY = 'op-dash-logos-v2'

// ─── Cache persistente ─────────────────────────────────

// Formato: { AAPL: { logo: "https://static2.finnhub.io/...", domain: "apple.com" }, ... }
let logoStore = {}
try {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) logoStore = JSON.parse(stored)
} catch { /* ignore */ }

function saveStore() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(logoStore)) } catch { /* ignore */ }
}

const failedTickers = new Set()

// ─── Fila para Finnhub API (60 req/min) ────────────────

const pendingQueue = []
let queueRunning = false

function processQueue() {
  if (queueRunning || pendingQueue.length === 0) return
  queueRunning = true

  const { ticker, resolve } = pendingQueue.shift()

  fetch(`/api/finnhub/api/v1/stock/profile2?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_KEY}`)
    .then(res => {
      if (!res.ok) throw new Error('not ok')
      return res.json()
    })
    .then(data => {
      const entry = {}

      // Logo direto do Finnhub (alta qualidade)
      if (data.logo) entry.logo = data.logo

      // Nome da empresa
      if (data.name) entry.name = data.name

      // Domínio para fallback (IconHorse)
      if (data.weburl) {
        try {
          const url = data.weburl.startsWith('http') ? data.weburl : `https://${data.weburl}`
          entry.domain = new URL(url).hostname.replace('www.', '')
        } catch { /* ignore */ }
      }

      if (entry.logo || entry.domain) {
        logoStore[ticker] = entry
        saveStore()
        resolve(entry)
      } else {
        failedTickers.add(ticker)
        resolve(null)
      }
    })
    .catch(() => {
      failedTickers.add(ticker)
      resolve(null)
    })
    .finally(() => {
      queueRunning = false
      // 60 req/min = 1 req/seg, mas vamos ser conservadores
      setTimeout(processQueue, 120)
    })
}

function requestLogo(ticker) {
  if (logoStore[ticker]) return Promise.resolve(logoStore[ticker])
  return new Promise(resolve => {
    pendingQueue.push({ ticker, resolve })
    processQueue()
  })
}

// ─── Cor de fallback ───────────────────────────────────

function tickerColor(ticker) {
  const colors = [
    '#f0b90b', '#3861fb', '#00c853', '#e91e63',
    '#9c27b0', '#00bcd4', '#ff9800', '#8bc34a',
    '#ff5722', '#607d8b', '#795548', '#4caf50',
  ]
  let hash = 0
  for (let i = 0; i < ticker.length; i++) {
    hash = ticker.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function Initials({ ticker, size }) {
  const bg = tickerColor(ticker)
  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center font-bold"
      style={{
        width: size,
        height: size,
        backgroundColor: bg + '20',
        color: bg,
        fontSize: size * 0.4,
      }}
    >
      {ticker.slice(0, 2)}
    </div>
  )
}

/** Retorna o nome da empresa a partir do cache (ou null se ainda não carregou) */
export function getAssetName(ticker) {
  return logoStore[ticker]?.name || null
}

// ─── Componente com fallback em cadeia ─────────────────

export default function AssetLogo({ ticker, categoria, size = 24 }) {
  const [entry, setEntry] = useState(logoStore[ticker] || null)
  const [stage, setStage] = useState('finnhub') // finnhub → iconhorse → initials
  const [failed, setFailed] = useState(failedTickers.has(ticker))

  const isCrypto = categoria === 'Cripto'

  // Buscar dados do Finnhub (ou ler do cache)
  useEffect(() => {
    if (!ticker || isCrypto || logoStore[ticker] || failedTickers.has(ticker) || !FINNHUB_KEY) {
      if (logoStore[ticker]) setEntry(logoStore[ticker])
      return
    }

    let cancelled = false

    requestLogo(ticker).then(e => {
      if (!cancelled) {
        if (e) { setEntry(e); setStage('finnhub') }
        else setFailed(true)
      }
    })

    return () => { cancelled = true }
  }, [ticker, isCrypto])

  if (!ticker) return null

  // ─── Cripto → CoinCap CDN ───
  if (isCrypto && !failed) {
    return (
      <img
        src={`https://assets.coincap.io/assets/icons/${ticker.toLowerCase()}@2x.png`}
        alt={ticker}
        className="rounded-full shrink-0 object-contain"
        style={{ width: size, height: size }}
        onError={() => { failedTickers.add(ticker); setFailed(true) }}
      />
    )
  }

  // ─── Stocks: cadeia de fallback ───
  if (!isCrypto && entry && !failed) {
    // Stage 1: Finnhub logo (alta qualidade)
    if (stage === 'finnhub' && entry.logo) {
      return (
        <img
          src={entry.logo}
          alt={ticker}
          className="rounded-full shrink-0 object-contain"
          style={{ width: size, height: size }}
          onError={() => setStage('iconhorse')}
        />
      )
    }

    // Stage 2: IconHorse (fallback via domínio)
    if ((stage === 'finnhub' || stage === 'iconhorse') && entry.domain) {
      return (
        <img
          src={`https://icon.horse/icon/${entry.domain}`}
          alt={ticker}
          className="rounded-full shrink-0 object-contain bg-white/90"
          style={{ width: size, height: size, padding: 2 }}
          onError={() => { setStage('initials'); setFailed(true) }}
        />
      )
    }
  }

  // ─── Fallback final: iniciais coloridas ───
  return <Initials ticker={ticker} size={size} />
}
