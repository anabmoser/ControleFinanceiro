import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltam variáveis de ambiente do Supabase');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Product {
  id: string;
  nome: string;
  categoria: string | null;
  aliases: string[];
  unidade: string;
  preco_medio: number;
  created_at: string;
}

export interface Purchase {
  id: string;
  data: string;
  fornecedor: string | null;
  numero_nota: string | null;
  valor_total: number;
  url_cupom: string | null;
  status: 'pending_review' | 'confirmed' | 'rejected';
  created_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string | null;
  nome_ocr: string;
  quantidade: number;
  unidade: string;
  preco_unitario: number;
  preco_total: number;
  needs_review: boolean;
  created_at: string;
}

export interface Bill {
  id: string;
  emissor: string;
  valor: number;
  vencimento: string;
  codigo_barras: string | null;
  url_boleto: string | null;
  status: 'pending' | 'paid' | 'overdue';
  created_at: string;
}

export interface ProductLearning {
  id: string;
  nome_original: string;
  product_id: string;
  confirmado_por_usuario: boolean;
  created_at: string;
}
