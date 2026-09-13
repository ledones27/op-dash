CREATE TABLE btc_trades (
  id serial PRIMARY KEY,
  data_entrada date NOT NULL,
  data_saida date,
  percentual numeric NOT NULL DEFAULT 0,
  preco_entrada numeric,
  preco_saida numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE btc_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON btc_trades
  FOR ALL USING (true) WITH CHECK (true);
