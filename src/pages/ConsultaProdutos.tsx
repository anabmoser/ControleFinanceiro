import React, { useState, useEffect } from 'react';
import { Search, Package, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProdutoHistorico {
  id: string;
  nome: string;
  categoria: string;
  compras: {
    data: string;
    fornecedor: string;
    quantidade: number;
    unidade: string;
    preco_unitario: number;
    preco_total: number;
  }[];
  preco_medio: number;
  preco_minimo: number;
  preco_maximo: number;
  total_compras: number;
  quantidade_total: number;
}

export default function ConsultaProdutos() {
  const [produtos, setProdutos] = useState<ProdutoHistorico[]>([]);
  const [todosOsProdutos, setTodosOsProdutos] = useState<ProdutoHistorico[]>([]);
  const [busca, setBusca] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoHistorico | null>(null);
  const [loading, setLoading] = useState(true);
  const [buscandoIA, setBuscandoIA] = useState(false);

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      setLoading(true);

      const { data: produtos, error: produtosError } = await supabase
        .from('products')
        .select('id, nome, categoria');

      if (produtosError) throw produtosError;

      const produtosComHistorico = await Promise.all(
        produtos.map(async (produto) => {
          const { data: itensData, error: itensError } = await supabase
            .from('purchase_items')
            .select('purchase_id, quantidade, unidade, preco_unitario, preco_total')
            .eq('product_id', produto.id);

          if (itensError) throw itensError;

          if (!itensData || itensData.length === 0) {
            return {
              id: produto.id,
              nome: produto.nome,
              categoria: produto.categoria || 'Sem categoria',
              compras: [],
              preco_medio: 0,
              preco_minimo: 0,
              preco_maximo: 0,
              total_compras: 0,
              quantidade_total: 0
            };
          }

          const purchaseIds = [...new Set(itensData.map(i => i.purchase_id))];

          const { data: comprasData, error: comprasError } = await supabase
            .from('purchases')
            .select('id, data, fornecedor')
            .eq('status', 'confirmed')
            .in('id', purchaseIds)
            .order('data', { ascending: false });

          if (comprasError) throw comprasError;

          const comprasMap = new Map(comprasData.map(c => [c.id, c]));

          const compras = itensData
            .map((item: any) => {
              const compra = comprasMap.get(item.purchase_id);
              if (!compra) return null;

              return {
                data: compra.data,
                fornecedor: compra.fornecedor,
                quantidade: parseFloat(item.quantidade),
                unidade: item.unidade,
                preco_unitario: parseFloat(item.preco_unitario),
                preco_total: parseFloat(item.preco_total)
              };
            })
            .filter(c => c !== null)
            .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

          const precos = compras.map(c => c.preco_unitario);
          const quantidades = compras.reduce((sum, c) => sum + c.quantidade, 0);

          return {
            id: produto.id,
            nome: produto.nome,
            categoria: produto.categoria || 'Sem categoria',
            compras,
            preco_medio: precos.length > 0 ? precos.reduce((a, b) => a + b, 0) / precos.length : 0,
            preco_minimo: precos.length > 0 ? Math.min(...precos) : 0,
            preco_maximo: precos.length > 0 ? Math.max(...precos) : 0,
            total_compras: compras.length,
            quantidade_total: quantidades
          };
        })
      );

      setProdutos(produtosComHistorico);
      setTodosOsProdutos(produtosComHistorico);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const buscarComIA = async () => {
    if (!busca.trim()) {
      setProdutos(todosOsProdutos);
      return;
    }

    try {
      setBuscandoIA(true);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/busca-produto-inteligente`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ busca }),
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar produtos');
      }

      const { produto_ids } = await response.json();

      if (produto_ids.length > 0) {
        const produtosFiltrados = todosOsProdutos.filter(p => produto_ids.includes(p.id));
        setProdutos(produtosFiltrados);

        if (produtosFiltrados.length === 1) {
          setProdutoSelecionado(produtosFiltrados[0]);
        }
      } else {
        const filtroManual = todosOsProdutos.filter(p =>
          p.nome.toLowerCase().includes(busca.toLowerCase()) ||
          p.categoria.toLowerCase().includes(busca.toLowerCase())
        );
        setProdutos(filtroManual);
      }
    } catch (error) {
      console.error('Erro na busca inteligente:', error);
      const filtroManual = todosOsProdutos.filter(p =>
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.categoria.toLowerCase().includes(busca.toLowerCase())
      );
      setProdutos(filtroManual);
    } finally {
      setBuscandoIA(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (busca.trim()) {
        buscarComIA();
      } else {
        setProdutos(todosOsProdutos);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [busca]);

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
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Consulta por Produto</h1>
          <p className="text-slate-600">Visualize histórico de preços, quantidades e fornecedores</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Buscar produto (ex: 'qj parm', 'tomate', 'batata ing')..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {buscandoIA && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            💡 Use busca inteligente: abreviações como "qj parm" encontram "Queijo Parmesão"
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-slate-600">Carregando produtos...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
              <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Package size={24} className="text-blue-600" />
                Produtos ({produtos.length})
              </h2>

              <div className="space-y-3">
                {produtos.map((produto) => (
                  <div
                    key={produto.id}
                    onClick={() => setProdutoSelecionado(produto)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      produtoSelecionado?.id === produto.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-slate-800">{produto.nome}</h3>
                        <p className="text-sm text-slate-500">{produto.categoria}</p>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-full">
                        {produto.total_compras} compras
                      </span>
                    </div>

                    {produto.total_compras > 0 ? (
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Preço Médio</p>
                          <p className="text-sm font-semibold text-blue-600">{formatarMoeda(produto.preco_medio)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Mínimo</p>
                          <p className="text-sm font-semibold text-green-600">{formatarMoeda(produto.preco_minimo)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500">Máximo</p>
                          <p className="text-sm font-semibold text-red-600">{formatarMoeda(produto.preco_maximo)}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 mt-2">Nenhuma compra registrada</p>
                    )}
                  </div>
                ))}

                {produtos.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <Package size={48} className="mx-auto mb-3 opacity-30" />
                    <p>Nenhum produto encontrado</p>
                    {busca && <p className="text-xs mt-2">Tente outra busca ou verifique a ortografia</p>}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
              {produtoSelecionado ? (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">{produtoSelecionado.nome}</h2>
                    <p className="text-slate-600">{produtoSelecionado.categoria}</p>

                    <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm text-slate-600">Quantidade Total</p>
                        <p className="text-xl font-bold text-slate-800">
                          {produtoSelecionado.quantidade_total.toFixed(2)} {produtoSelecionado.compras[0]?.unidade}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Total de Compras</p>
                        <p className="text-xl font-bold text-slate-800">{produtoSelecionado.total_compras}</p>
                      </div>
                    </div>
                  </div>

                  {produtoSelecionado.total_compras > 0 ? (
                    <>
                      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Calendar size={20} className="text-blue-600" />
                        Histórico de Compras
                      </h3>

                      <div className="space-y-3">
                        {produtoSelecionado.compras.map((compra, idx) => {
                      const variacaoPreco = idx < produtoSelecionado.compras.length - 1
                        ? compra.preco_unitario - produtoSelecionado.compras[idx + 1].preco_unitario
                        : 0;

                      return (
                        <div key={idx} className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-slate-800">{compra.fornecedor}</p>
                              <p className="text-sm text-slate-500">{formatarData(compra.data)}</p>
                            </div>
                            {variacaoPreco !== 0 && (
                              <div className={`flex items-center gap-1 text-sm ${variacaoPreco > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {variacaoPreco > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                {Math.abs(variacaoPreco).toFixed(2)}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-3 mt-2 text-sm">
                            <div>
                              <p className="text-slate-500">Quantidade</p>
                              <p className="font-semibold text-slate-800">{compra.quantidade} {compra.unidade}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Preço Unit.</p>
                              <p className="font-semibold text-blue-600">{formatarMoeda(compra.preco_unitario)}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Total</p>
                              <p className="font-semibold text-slate-800">{formatarMoeda(compra.preco_total)}</p>
                            </div>
                          </div>
                        </div>
                      );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <Package size={48} className="mx-auto mb-3 opacity-30" />
                      <p>Este produto ainda não possui compras registradas</p>
                      <p className="text-xs mt-2">Faça upload de cupons fiscais que contenham este produto</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <Package size={64} className="mx-auto mb-4 opacity-20" />
                    <p>Selecione um produto para ver o histórico</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
