/**
 * Seed btc_trades table from "Operacional BTC.xlsx" (sheet "BTC S").
 *
 * Usage:
 *   1. Place "Operacional BTC.xlsx" in the project root (or pass its path as arg)
 *   2. Run: node scripts/seed-btc.mjs [path-to-xlsx]
 *
 * Requires: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

// Parse .env manually to avoid dotenv dependency
const envFile = readFileSync(resolve('.env'), 'utf8')
for (const line of envFile.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim()
}

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function excelSerialToDate(serial) {
  if (!serial || typeof serial !== 'number') return null
  const d = new Date((serial - 25569) * 86400000)
  return d.toISOString().slice(0, 10)
}

async function main() {
  const filePath = process.argv[2] || resolve('Operacional BTC.xlsx')
  console.log(`Reading: ${filePath}`)

  const buf = readFileSync(filePath)
  const wb = XLSX.read(buf, { type: 'buffer' })

  const sheet = wb.Sheets['BTC S']
  if (!sheet) {
    console.error('Sheet "BTC S" not found. Available:', wb.SheetNames)
    process.exit(1)
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  const trades = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    const entrada = row[0]
    const saida = row[2]
    const percentual = row[3]

    if (entrada == null || percentual == null) continue

    const dataEntrada = typeof entrada === 'number' ? excelSerialToDate(entrada) : entrada
    const dataSaida = typeof saida === 'number' ? excelSerialToDate(saida) : saida || null

    if (!dataEntrada) continue

    let pct = typeof percentual === 'number' ? percentual : parseFloat(percentual) || 0
    // Excel stores % as raw multipliers (2.31 = 231%). Convert to percentage for the DB.
    trades.push({
      data_entrada: dataEntrada,
      data_saida: dataSaida,
      percentual: Math.round(pct * 10000) / 100,
    })
  }

  console.log(`Found ${trades.length} trades to insert`)

  if (trades.length === 0) {
    console.log('No trades found. Check the Excel structure.')
    return
  }

  console.log('First trade:', trades[0])
  console.log('Last trade:', trades[trades.length - 1])

  const { data, error } = await supabase
    .from('btc_trades')
    .insert(trades)
    .select()

  if (error) {
    console.error('Insert error:', error)
    process.exit(1)
  }

  console.log(`Inserted ${data.length} BTC trades successfully!`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
