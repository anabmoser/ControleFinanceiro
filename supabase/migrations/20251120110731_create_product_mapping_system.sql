/*
  # Sistema de Mapeamento e Aprendizado de Produtos

  1. Nova Tabela: product_mappings
    - Armazena o mapeamento entre nomes OCR e produtos reais
    - Aprende automaticamente com confirmações do usuário
    - `id` (uuid, primary key)
    - `nome_ocr` (text) - Nome extraído do cupom fiscal
    - `product_id` (uuid) - ID do produto cadastrado
    - `confidence` (numeric) - Nível de confiança (0-1)
    - `confirmed_by_user` (boolean) - Se foi confirmado manualmente
    - `times_used` (integer) - Quantas vezes foi usado
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. Índices
    - Índice único em nome_ocr para busca rápida
    - Índice em product_id para consultas por produto

  3. Segurança
    - RLS habilitado
    - Políticas para usuários autenticados
*/

-- Criar tabela de mapeamentos
CREATE TABLE IF NOT EXISTS product_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_ocr text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  confidence numeric DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  confirmed_by_user boolean DEFAULT false,
  times_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_mappings_nome_ocr ON product_mappings(LOWER(nome_ocr));
CREATE INDEX IF NOT EXISTS idx_product_mappings_product_id ON product_mappings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_mappings_confidence ON product_mappings(confidence DESC);

-- Habilitar RLS
ALTER TABLE product_mappings ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Usuários autenticados podem visualizar mapeamentos"
  ON product_mappings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários autenticados podem criar mapeamentos"
  ON product_mappings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar mapeamentos"
  ON product_mappings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem deletar mapeamentos"
  ON product_mappings FOR DELETE
  TO authenticated
  USING (true);

-- Função para normalizar nomes OCR
CREATE OR REPLACE FUNCTION normalize_ocr_name(text) 
RETURNS text AS $$
  SELECT LOWER(TRIM(REGEXP_REPLACE($1, '\s+', ' ', 'g')));
$$ LANGUAGE SQL IMMUTABLE;

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_product_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_mappings_updated_at
  BEFORE UPDATE ON product_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_product_mappings_updated_at();