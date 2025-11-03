/*
  # Adicionar campo total_amount na tabela purchases

  1. Alterações
    - Adiciona coluna `total_amount` (decimal) na tabela `purchases`
    - Campo opcional para armazenar o valor total da compra

  2. Observações
    - Campo pode ser null para compras antigas
    - Será preenchido automaticamente pelo processamento de cupons
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchases' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE purchases ADD COLUMN total_amount DECIMAL(10,2);
  END IF;
END $$;
