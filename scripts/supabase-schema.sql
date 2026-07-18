-- ============================================================
-- SUPABASE SCHEMA — Cole este SQL no SQL Editor do Supabase
-- (Vá em SQL Editor → New Query → cole tudo → Run)
-- ============================================================

-- Tabela de trades (todas as categorias em uma tabela só)
CREATE TABLE trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL CHECK (categoria IN ('Ações', 'Cripto', 'Commodities', 'Índices')),
  data_entrada DATE NOT NULL,
  ativo TEXT NOT NULL,
  preco_entrada NUMERIC NOT NULL,
  operacao TEXT NOT NULL CHECK (operacao IN ('LONG', 'SHORT')),
  data_saida DATE,
  preco_saida NUMERIC,
  status TEXT GENERATED ALWAYS AS (
    CASE WHEN data_saida IS NOT NULL AND preco_saida IS NOT NULL THEN 'Fechada' ELSE 'Aberta' END
  ) STORED,
  aporte NUMERIC NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_trades_categoria ON trades(categoria);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_data_entrada ON trades(data_entrada);

-- Tabela de watchlist (pré-entradas)
CREATE TABLE watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL CHECK (categoria IN ('Ações', 'Cripto', 'Commodities', 'Índices')),
  ativo TEXT NOT NULL,
  operacao TEXT CHECK (operacao IN ('LONG', 'SHORT')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_watchlist_categoria ON watchlist(categoria);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (protege os dados)
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

-- Políticas: permite tudo via anon key (dashboard pessoal, protegido por senha)
CREATE POLICY "Allow all on trades" ON trades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on watchlist" ON watchlist FOR ALL USING (true) WITH CHECK (true);
