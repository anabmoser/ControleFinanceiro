import React, { useState, useEffect } from 'react';
import { Calendar, Download, Filter, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ItemPeriodo {
  produto: string;
  categoria: string;
  fornecedor: string;
  data: string;
  quantidade: number;
  unidade: string;
  preco_unitario: number;
  preco_total: number;
}

export default function ConsultaPeriodo() {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [fornecedorFiltro, setFornecedorFiltro] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [itens, setItens] = useState<ItemPeriodo[]>([]);
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [resumo, setResumo] = useState({
    total_gasto: 0,
    total_compras: 0,
    total_itens: 0
  });

  useEffect(() => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    setDataInicio(primeiroDia.toISOString().split('T')[0]);
    setDataFim(hoje.toISOString().split('T')[0]);

    carregarFiltros();
  }, []);

  useEffect(() => {
    if (dataInicio && dataFim) {
      consultarPeriodo();
    }
  }, [dataInicio, dataFim]);

  const carregarFiltros = async () => {
    try {
      const { data: fornecedoresData } = await supabase
        .from('purchases')
        .select('fornecedor')
        .not('fornecedor', 'is', null)
        .order('fornecedor');

      const { data: categoriasData } = await supabase
        .from('products')
        .select('categoria')
        .not('categoria', 'is', null)
        .order('categoria');

      const fornecedoresUnicos = [...new Set(fornecedoresData?.map(f => f.fornecedor) || [])];
      const categoriasUnicas = [...new Set(categoriasData?.map(c => c.categoria) || [])];

      setFornecedores(fornecedoresUnicos);
      setCategorias(categoriasUnicas);
    } catch (error) {
      console.error('Erro ao carregar filtros:', error);
    }
  };

  const consultarPeriodo = async () => {
    try {
      setLoading(true);

      const { data: comprasData, error: comprasError } = await supabase
        .from('purchases')
        .select('id, data, fornecedor')
        .eq('status', 'confirmed')
        .gte('data', dataInicio)
        .lte('data', dataFim);

      if (comprasError) throw comprasError;

      if (!comprasData || comprasData.length === 0) {
        setItens([]);
        setResumo({ total_gasto: 0, total_compras: 0, total_itens: 0 });
        return;
      }

      const purchaseIds = comprasData.map(c => c.id);

      const { data: itensData, error: itensError } = await supabase
        .from('purchase_items')
        .select('purchase_id, product_id, quantidade, unidade, preco_unitario, preco_total')
        .in('purchase_id', purchaseIds);

      if (itensError) throw itensError;

      const productIds = [...new Set(itensData.map(i => i.product_id))];

      const { data: produtosData, error: produtosError } = await supabase
        .from('products')
        .select('id, nome, categoria')
        .in('id', productIds);

      if (produtosError) throw produtosError;

      const produtosMap = new Map(produtosData.map(p => [p.id, p]));
      const comprasMap = new Map(comprasData.map(c => [c.id, c]));

      let itensProcessados = itensData
        .map((item: any) => {
          const produto = produtosMap.get(item.product_id);
          const compra = comprasMap.get(item.purchase_id);

          if (!produto || !compra) return null;

          return {
            produto: produto.nome,
            categoria: produto.categoria || 'Sem categoria',
            fornecedor: compra.fornecedor,
            data: compra.data,
            quantidade: parseFloat(item.quantidade),
            unidade: item.unidade,
            preco_unitario: parseFloat(item.preco_unitario),
            preco_total: parseFloat(item.preco_total)
          };
        })
        .filter(item => item !== null);

      if (fornecedorFiltro) {
        itensProcessados = itensProcessados.filter(i => i.fornecedor === fornecedorFiltro);
      }

      if (categoriaFiltro) {
        itensProcessados = itensProcessados.filter(i => i.categoria === categoriaFiltro);
      }

      itensProcessados.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

      setItens(itensProcessados);

      const totalGasto = itensProcessados.reduce((sum, item) => sum + item.preco_total, 0);

      setResumo({
        total_gasto: totalGasto,
        total_compras: comprasData.length,
        total_itens: itensProcessados.length
      });
    } catch (error) {
      console.error('Erro ao consultar período:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = () => {
    const headers = ['Data', 'Produto', 'Categoria', 'Fornecedor', 'Quantidade', 'Unidade', 'Preço Unit.', 'Total'];
    const rows = itens.map(item => [
      new Date(item.data).toLocaleDateString('pt-BR'),
      item.produto,
      item.categoria,
      item.fornecedor,
      item.quantidade,
      item.unidade,
      item.preco_unitario.toFixed(2),
      item.preco_total.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `compras_${dataInicio}_${dataFim}.csv`;
    link.click();
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Consulta por Período</h1>
          <p className="text-slate-600">Analise compras por data, produto e fornecedor</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-800">Filtros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Início
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Data Fim
              </label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fornecedor
              </label>
              <select
                value={fornecedorFiltro}
                onChange={(e) => {
                  setFornecedorFiltro(e.target.value);
                  consultarPeriodo();
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {fornecedores.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Categoria
              </label>
              <select
                value={categoriaFiltro}
                onChange={(e) => {
                  setCategoriaFiltro(e.target.value);
                  consultarPeriodo();
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas</option>
                {categorias.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={exportarCSV}
              disabled={itens.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              <Download size={20} />
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total de Compras</p>
                <p className="text-2xl font-bold text-slate-800">{resumo.total_compras}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-green-100 rounded-lg">
                <Package className="text-green-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total de Itens</p>
                <p className="text-2xl font-bold text-slate-800">{resumo.total_itens}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-amber-100 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <p className="text-sm text-slate-600">Gasto Total</p>
                <p className="text-2xl font-bold text-slate-800">{formatarMoeda(resumo.total_gasto)}</p>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600">Carregando dados...</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Produto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Categoria</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Fornecedor</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">Quantidade</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">Preço Unit.</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {itens.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {formatarData(item.data)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {item.produto}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {item.categoria}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {item.fornecedor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right">
                        {item.quantidade.toFixed(2)} {item.unidade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-semibold">
                        {formatarMoeda(item.preco_unitario)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 text-right font-semibold">
                        {formatarMoeda(item.preco_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {itens.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Package size={48} className="mx-auto mb-3 opacity-30" />
                  <p>Nenhuma compra encontrada no período selecionado</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
