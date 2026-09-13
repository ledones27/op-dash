import { supabase, isSupabaseConfigured } from '../lib/supabase'

const INITIAL_CAPITAL = 1000

function dbToTrade(row) {
  return {
    id: row.id,
    dataEntrada: row.data_entrada,
    dataSaida: row.data_saida,
    percentual: row.percentual,
    precoEntrada: row.preco_entrada,
    precoSaida: row.preco_saida,
  }
}

function tradeToDb(trade) {
  const row = {}
  if (trade.dataEntrada !== undefined) row.data_entrada = trade.dataEntrada
  if (trade.dataSaida !== undefined) row.data_saida = trade.dataSaida || null
  if (trade.percentual !== undefined) row.percentual = trade.percentual
  if (trade.precoEntrada !== undefined) row.preco_entrada = trade.precoEntrada || null
  if (trade.precoSaida !== undefined) row.preco_saida = trade.precoSaida || null
  return row
}

export async function fetchBtcPrice(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-')
  const formatted = `${d}-${m}-${y}`
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/bitcoin/history?date=${formatted}&localization=false`)
    if (!res.ok) return null
    const data = await res.json()
    return Math.round(data.market_data?.current_price?.usd ?? 0)
  } catch {
    return null
  }
}

export function computeBtcEquity(trades, capital = INITIAL_CAPITAL) {
  let banca = capital
  return trades.map(t => {
    const inicial = banca
    const pnl = inicial * (t.percentual / 100)
    banca = inicial + pnl
    return { ...t, inicial, pnl, banca }
  })
}

export async function fetchBtcTrades() {
  if (!isSupabaseConfigured()) return []

  const { data, error } = await supabase
    .from('btc_trades')
    .select('*')
    .order('data_entrada', { ascending: true })

  if (error) {
    console.error('Erro ao buscar BTC trades:', error)
    return []
  }

  return data.map(dbToTrade)
}

export async function createBtcTrade(trade) {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado')

  const row = tradeToDb(trade)
  const { data, error } = await supabase
    .from('btc_trades')
    .insert(row)
    .select()
    .single()

  if (error) {
    if (error.message?.includes('preco_')) {
      delete row.preco_entrada
      delete row.preco_saida
      const retry = await supabase.from('btc_trades').insert(row).select().single()
      if (retry.error) throw retry.error
      return dbToTrade(retry.data)
    }
    throw error
  }
  return dbToTrade(data)
}

export async function updateBtcTrade(id, updates) {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado')

  const row = tradeToDb(updates)
  const { data, error } = await supabase
    .from('btc_trades')
    .update(row)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    // If price columns don't exist yet, retry without them
    if (error.message?.includes('preco_')) {
      delete row.preco_entrada
      delete row.preco_saida
      const retry = await supabase.from('btc_trades').update(row).eq('id', id).select().single()
      if (retry.error) throw retry.error
      return dbToTrade(retry.data)
    }
    throw error
  }
  return dbToTrade(data)
}

export async function deleteBtcTrade(id) {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado')

  const { error } = await supabase
    .from('btc_trades')
    .delete()
    .eq('id', id)

  if (error) throw error
}
