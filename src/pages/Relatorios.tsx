import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, Package, DollarSign, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type TipoRelatorio = 'semanal' | 'mensal' | 'anual';

interface DadosRelatorio {
  periodo: string;
  total_gasto: number;
  total_compras: number;
  total_itens: number;
  produtos_mais_comprados: { nome: string; quantidade: number; total: number }[];
  fornecedores: { nome: string; total: number; compras: number }[];
  categorias: { nome: string; total: number; percentual: number }[];
}

export default function Relatorios() {
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>('mensal');
  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState<DadosRelatorio | null>(null);

  useEffect(() => {
    gerarRelatorio();
  }, [tipoRelatorio]);

  const calcularPeriodo = () => {
    const hoje = new Date();
    let dataInicio = new Date();
    let dataFim = hoje;
    let labelPeriodo = '';

    switch (tipoRelatorio) {
      case 'semanal':
        dataInicio = new Date(hoje);
        dataInicio.setDate(hoje.getDate() - 7);
        labelPeriodo = 'Últimos 7 dias';
        break;
      case 'mensal':
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        labelPeriodo = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        break;
      case 'anual':
        dataInicio = new Date(hoje.getFullYear(), 0, 1);
        labelPeriodo = `Ano ${hoje.getFullYear()}`;
        break;
    }

    return {
      dataInicio: dataInicio.toISOString().split('T')[0],
      dataFim: dataFim.toISOString().split('T')[0],
      labelPeriodo
    };
  };

  const gerarRelatorio = async () => {
    try {
      setLoading(true);
      const { dataInicio, dataFim, labelPeriodo } = calcularPeriodo();

      const { data: itens, error } = await supabase
        .from('purchase_items')
        .select(`
          quantidade,
          preco_total,
          products!inner(nome, categoria),
          purchases!inner(data, fornecedor, status)
        `)
        .eq('purchases.status', 'confirmed')
        .gte('purchases.data', dataInicio)
        .lte('purchases.data', dataFim);

      if (error) throw error;

      const totalGasto = itens.reduce((sum, item) => sum + parseFloat(item.preco_total), 0);
      const comprasUnicas = [...new Set(itens.map(item => item.purchases.data))];

      const produtosMap = new Map();
      itens.forEach((item: any) => {
        const nome = item.products.nome;
        const atual = produtosMap.get(nome) || { quantidade: 0, total: 0 };
        produtosMap.set(nome, {
          quantidade: atual.quantidade + parseFloat(item.quantidade),
          total: atual.total + parseFloat(item.preco_total)
        });
      });

      const produtosMaisComprados = Array.from(produtosMap.entries())
        .map(([nome, dados]) => ({ nome, ...dados }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      const fornecedoresMap = new Map();
      itens.forEach((item: any) => {
        const fornecedor = item.purchases.fornecedor;
        const atual = fornecedoresMap.get(fornecedor) || { total: 0, compras: new Set() };
        atual.total += parseFloat(item.preco_total);
        atual.compras.add(item.purchases.data);
        fornecedoresMap.set(fornecedor, atual);
      });

      const fornecedores = Array.from(fornecedoresMap.entries())
        .map(([nome, dados]) => ({
          nome,
          total: dados.total,
          compras: dados.compras.size
        }))
        .sort((a, b) => b.total - a.total);

      const categoriasMap = new Map();
      itens.forEach((item: any) => {
        const categoria = item.products.categoria || 'Sem categoria';
        const atual = categoriasMap.get(categoria) || 0;
        categoriasMap.set(categoria, atual + parseFloat(item.preco_total));
      });

      const categorias = Array.from(categoriasMap.entries())
        .map(([nome, total]) => ({
          nome,
          total,
          percentual: (total / totalGasto) * 100
        }))
        .sort((a, b) => b.total - a.total);

      setRelatorio({
        periodo: labelPeriodo,
        total_gasto: totalGasto,
        total_compras: comprasUnicas.length,
        total_itens: itens.length,
        produtos_mais_comprados: produtosMaisComprados,
        fornecedores,
        categorias
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Relatórios</h1>
          <p className="text-slate-600">Análise detalhada de gastos e compras</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-800">Período do Relatório</h2>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setTipoRelatorio('semanal')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                tipoRelatorio === 'semanal'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semanal
            </button>
            <button
              onClick={() => setTipoRelatorio('mensal')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                tipoRelatorio === 'mensal'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setTipoRelatorio('anual')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                tipoRelatorio === 'anual'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Anual
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600">Gerando relatório...</p>
          </div>
        ) : relatorio ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">{relatorio.periodo}</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-white/20 rounded-lg">
                      <DollarSign size={28} />
                    </div>
                    <div>
                      <p className="text-blue-100 text-sm">Gasto Total</p>
                      <p className="text-3xl font-bold">{formatarMoeda(relatorio.total_gasto)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-white/20 rounded-lg">
                      <Calendar size={28} />
                    </div>
                    <div>
                      <p className="text-green-100 text-sm">Total de Compras</p>
                      <p className="text-3xl font-bold">{relatorio.total_compras}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-6 text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-white/20 rounded-lg">
                      <Package size={28} />
                    </div>
                    <div>
                      <p className="text-amber-100 text-sm">Itens Comprados</p>
                      <p className="text-3xl font-bold">{relatorio.total_itens}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={20} className="text-blue-600" />
                  <h3 className="text-lg font-semibold text-slate-800">Produtos Mais Comprados</h3>
                </div>

                <div className="space-y-3">
                  {relatorio.produtos_mais_comprados.map((produto, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-sm">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-medium text-slate-800">{produto.nome}</p>
                          <p className="text-sm text-slate-500">{produto.quantidade.toFixed(2)} unidades</p>
                        </div>
                      </div>
                      <p className="font-semibold text-blue-600">{formatarMoeda(produto.total)}</p>
                    </div>
                  ))}

                  {relatorio.produtos_mais_comprados.length === 0 && (
                    <p className="text-center text-slate-500 py-4">Nenhum produto encontrado</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={20} className="text-green-600" />
                  <h3 className="text-lg font-semibold text-slate-800">Fornecedores</h3>
                </div>

                <div className="space-y-3">
                  {relatorio.fornecedores.map((fornecedor, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-800">{fornecedor.nome}</p>
                        <p className="text-sm text-slate-500">{fornecedor.compras} compras</p>
                      </div>
                      <p className="font-semibold text-green-600">{formatarMoeda(fornecedor.total)}</p>
                    </div>
                  ))}

                  {relatorio.fornecedores.length === 0 && (
                    <p className="text-center text-slate-500 py-4">Nenhum fornecedor encontrado</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package size={20} className="text-amber-600" />
                <h3 className="text-lg font-semibold text-slate-800">Gastos por Categoria</h3>
              </div>

              <div className="space-y-4">
                {relatorio.categorias.map((categoria, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-slate-800">{categoria.nome}</span>
                      <div className="text-right">
                        <span className="font-semibold text-amber-600">{formatarMoeda(categoria.total)}</span>
                        <span className="text-sm text-slate-500 ml-2">({categoria.percentual.toFixed(1)}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-amber-400 to-amber-600 h-2 rounded-full transition-all"
                        style={{ width: `${categoria.percentual}%` }}
                      ></div>
                    </div>
                  </div>
                ))}

                {relatorio.categorias.length === 0 && (
                  <p className="text-center text-slate-500 py-4">Nenhuma categoria encontrada</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <BarChart3 size={64} className="mx-auto mb-4 opacity-20" />
            <p>Nenhum dado disponível para o período selecionado</p>
          </div>
        )}
      </div>
    </div>
  );
}
