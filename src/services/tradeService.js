import { supabase, isSupabaseConfigured } from '../lib/supabase'
import seedData from '../../seed-data.json'

/** Parse YYYY-MM-DD como data local (sem shift UTC) */
function parseLocal(s) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// ─── TRADES ──────────────────────────────────────────────

export async function fetchAllTrades() {
  if (!isSupabaseConfigured()) return seedToTrades()

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('data_entrada', { ascending: true })

  if (error) {
    console.error('Erro ao buscar trades:', error)
    return seedToTrades()
  }

  return data.map(dbToTrade)
}

export async function createTrade(trade) {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado')

  const { data, error } = await supabase
    .from('trades')
    .insert(tradeToDb(trade))
    .select()
    .single()

  if (error) throw error
  return dbToTrade(data)
}

export async function updateTrade(id, updates) {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado')

  const { data, error } = await supabase
    .from('trades')
    .update(tradeToDb(updates))
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return dbToTrade(data)
}

export async function deleteTrade(id) {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado')

  const { error } = await supabase
    .from('trades')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ─── WATCHLIST ───────────────────────────────────────────

export async function fetchWatchlist() {
  if (!isSupabaseConfigured()) return seedData.watchlist

  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Erro ao buscar watchlist:', error)
    return seedData.watchlist
  }

  // Agrupar por categoria
  const grouped = { 'Ações': [], 'Cripto': [], 'Commodities': [], 'Índices': [] }
  for (const item of data) {
    if (grouped[item.categoria]) {
      grouped[item.categoria].push({
        id: item.id,
        ativo: item.ativo,
        operacao: item.operacao,
        operando: item.operando ?? true,
        comentario: item.comentario || null,
      })
    }
  }
  return grouped
}

export async function addToWatchlist(item) {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado')

  const { data, error } = await supabase
    .from('watchlist')
    .insert({
      categoria: item.categoria,
      ativo: item.ativo.toUpperCase().trim(),
      operacao: item.operacao || null,
      operando: item.operando ?? true,
      comentario: item.comentario || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateWatchlistItem(id, updates) {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado')

  const db = {}
  if (updates.categoria !== undefined) db.categoria = updates.categoria
  if (updates.ativo !== undefined) db.ativo = updates.ativo.toUpperCase().trim()
  if (updates.operacao !== undefined) db.operacao = updates.operacao || null
  if (updates.operando !== undefined) db.operando = updates.operando
  if (updates.comentario !== undefined) db.comentario = updates.comentario || null

  const { data, error } = await supabase
    .from('watchlist')
    .update(db)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function removeFromWatchlist(id) {
  if (!isSupabaseConfigured()) throw new Error('Supabase não configurado')

  const { error } = await supabase
    .from('watchlist')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ─── Conversores DB ↔ Frontend ──────────────────────────

function dbToTrade(row) {
  const entry = Number(row.preco_entrada)
  const exit = row.preco_saida ? Number(row.preco_saida) : null
  const aporte = Number(row.aporte)
  const isLong = row.operacao === 'LONG'

  let pnlPercent = null
  let resultado = null
  if (exit != null) {
    pnlPercent = isLong
      ? (exit - entry) / entry
      : (entry - exit) / entry
    resultado = pnlPercent * aporte
  }

  let duracao = null
  const d1 = row.data_entrada ? parseLocal(row.data_entrada) : null
  const d2 = row.data_saida ? parseLocal(row.data_saida) : null
  if (d1 && d2) {
    duracao = Math.round((d2 - d1) / 86400000)
  } else if (d1) {
    duracao = Math.round((Date.now() - d1.getTime()) / 86400000)
  }

  return {
    id: row.id,
    categoria: row.categoria,
    dataEntrada: row.data_entrada,
    ativo: row.ativo,
    precoEntrada: entry,
    operacao: row.operacao,
    dataSaida: row.data_saida || null,
    precoSaida: exit,
    pnlPercent,
    status: row.status || (exit != null ? 'Fechada' : 'Aberta'),
    aporte,
    resultado,
    duracao,
    operando: row.operando ?? true,
    comentario: row.comentario || null,
  }
}

function tradeToDb(trade) {
  const db = {}
  if (trade.categoria !== undefined) db.categoria = trade.categoria
  if (trade.dataEntrada !== undefined) db.data_entrada = trade.dataEntrada
  if (trade.ativo !== undefined) db.ativo = trade.ativo.toUpperCase().trim()
  if (trade.precoEntrada !== undefined) db.preco_entrada = trade.precoEntrada
  if (trade.operacao !== undefined) db.operacao = trade.operacao
  if (trade.dataSaida !== undefined) db.data_saida = trade.dataSaida || null
  if (trade.precoSaida !== undefined) db.preco_saida = trade.precoSaida || null
  if (trade.aporte !== undefined) db.aporte = trade.aporte
  if (trade.operando !== undefined) db.operando = trade.operando
  if (trade.comentario !== undefined) db.comentario = trade.comentario
  return db
}

// ─── Seed data fallback ─────────────────────────────────

function seedToTrades() {
  const all = []
  for (const [cat, trades] of Object.entries(seedData.trades)) {
    for (const t of trades) {
      all.push({
        ...t,
        id: `seed-${cat}-${t.ativo}-${t.dataEntrada}`,
        categoria: cat,
      })
    }
  }
  return all
}
