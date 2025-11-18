/*
  # Estrutura Simplificada - Controle Restaurante

  1. Tabelas Criadas
    - `products` - Catálogo de produtos com aprendizado
      - `id` (uuid, primary key)
      - `nome` (text) - Nome do produto
      - `categoria` (text) - Categoria (legumes, carnes, bebidas, etc)
      - `aliases` (text[]) - Nomes alternativos aprendidos
      - `unidade` (text) - kg, unidade, litro, etc
      - `preco_medio` (decimal) - Preço médio para referência
      - `created_at` (timestamp)
    
    - `purchases` - Compras escaneadas
      - `id` (uuid, primary key)
      - `data` (date) - Data da compra
      - `fornecedor` (text) - Nome do fornecedor
      - `numero_nota` (text) - Número da nota fiscal
      - `valor_total` (decimal) - Valor total da compra
      - `url_cupom` (text) - URL da imagem do cupom
      - `status` (text) - pending_review, confirmed, rejected
      - `created_at` (timestamp)
    
    - `purchase_items` - Itens de cada compra
      - `id` (uuid, primary key)
      - `purchase_id` (uuid, foreign key)
      - `product_id` (uuid, foreign key, nullable)
      - `nome_ocr` (text) - Nome extraído do OCR
      - `quantidade` (decimal)
      - `unidade` (text)
      - `preco_unitario` (decimal)
      - `preco_total` (decimal)
      - `needs_review` (boolean) - Se precisa revisão manual
      - `created_at` (timestamp)
    
    - `bills` - Boletos a pagar
      - `id` (uuid, primary key)
      - `emissor` (text) - Quem emitiu o boleto
      - `valor` (decimal)
      - `vencimento` (date)
      - `codigo_barras` (text)
      - `url_boleto` (text)
      - `status` (text) - pending, paid, overdue
      - `created_at` (timestamp)
    
    - `product_learning` - Log de aprendizado de produtos
      - `id` (uuid, primary key)
      - `nome_original` (text) - Nome encontrado no OCR
      - `product_id` (uuid, foreign key) - Produto associado
      - `confirmado_por_usuario` (boolean)
      - `created_at` (timestamp)

  2. Segurança
    - SEM RLS (uso privado, sem autenticação)
    - Todas as tabelas públicas para o app

  3. Índices
    - Índices para buscas rápidas de produtos por nome e aliases
*/

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text,
  aliases text[] DEFAULT ARRAY[]::text[],
  unidade text DEFAULT 'kg',
  preco_medio decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tabela de compras
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL DEFAULT CURRENT_DATE,
  fornecedor text,
  numero_nota text,
  valor_total decimal(10,2) DEFAULT 0,
  url_cupom text,
  status text DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'confirmed', 'rejected')),
  created_at timestamptz DEFAULT now()
);

-- Tabela de itens da compra
CREATE TABLE IF NOT EXISTS purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid REFERENCES purchases(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  nome_ocr text NOT NULL,
  quantidade decimal(10,3) DEFAULT 0,
  unidade text DEFAULT 'kg',
  preco_unitario decimal(10,2) DEFAULT 0,
  preco_total decimal(10,2) DEFAULT 0,
  needs_review boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Tabela de boletos
CREATE TABLE IF NOT EXISTS bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emissor text NOT NULL,
  valor decimal(10,2) NOT NULL,
  vencimento date NOT NULL,
  codigo_barras text,
  url_boleto text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at timestamptz DEFAULT now()
);

-- Tabela de aprendizado de produtos
CREATE TABLE IF NOT EXISTS product_learning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_original text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  confirmado_por_usuario boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_products_nome ON products USING gin(to_tsvector('portuguese', nome));
CREATE INDEX IF NOT EXISTS idx_products_aliases ON products USING gin(aliases);
CREATE INDEX IF NOT EXISTS idx_purchases_data ON purchases(data DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_bills_vencimento ON bills(vencimento);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);

-- Inserir alguns produtos iniciais comuns em restaurantes
INSERT INTO products (nome, categoria, unidade, preco_medio) VALUES
  ('Tomate', 'Legumes', 'kg', 5.00),
  ('Cebola', 'Legumes', 'kg', 4.00),
  ('Alho', 'Temperos', 'kg', 25.00),
  ('Batata', 'Legumes', 'kg', 3.50),
  ('Cenoura', 'Legumes', 'kg', 4.50),
  ('Frango', 'Carnes', 'kg', 12.00),
  ('Carne Bovina', 'Carnes', 'kg', 35.00),
  ('Arroz', 'Grãos', 'kg', 5.50),
  ('Feijão', 'Grãos', 'kg', 7.00),
  ('Óleo', 'Mercearia', 'litro', 8.00),
  ('Sal', 'Temperos', 'kg', 2.00),
  ('Açúcar', 'Mercearia', 'kg', 4.00)
ON CONFLICT DO NOTHING;
