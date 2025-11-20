import React, { useState, useEffect } from 'react';
import { Check, X, Search, Package, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Item {
  nome: string;
  quantidade: number;
  unidade: string;
  preco_unitario: number;
  preco_total: number;
  product_id?: string | null;
  needs_confirmation?: boolean;
}

interface DadosCupom {
  fornecedor: string;
  numero_nota: string;
  data: string;
  valor_total: number;
  itens: Item[];
  precisa_confirmacao?: boolean;
  itens_nao_vinculados?: number;
}

interface Produto {
  id: string;
  nome: string;
  categoria: string;
  aliases?: string[];
}

interface Props {
  dadosCupom: DadosCupom;
  urlImagem: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export default function VinculacaoProdutos({ dadosCupom, urlImagem, onConfirmar, onCancelar }: Props) {
  const [itens, setItens] = useState<Item[]>(dadosCupom.itens);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [buscando, setBuscando] = useState<Map<number, string>>(new Map());
  const [sugestoes, setSugestoes] = useState<Map<number, Produto[]>>(new Map());
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, nome, categoria, aliases')
      .order('nome');

    if (data) {
      setProdutos(data);
      itens.forEach((item, idx) => {
        if (!item.product_id) {
          buscarSugestoes(item.nome, idx);
        }
      });
    }
  };

  const buscarSugestoes = async (nomeOcr: string, index: number) => {
    const termo = nomeOcr.toLowerCase();

    const produtosFiltrados = produtos.filter(p => {
      const nomeMatch = p.nome.toLowerCase().includes(termo);
      const aliasMatch = p.aliases?.some(a =>
        a.toLowerCase().includes(termo) || termo.includes(a.toLowerCase())
      );
      return nomeMatch || aliasMatch;
    });

    if (produtosFiltrados.length === 0) {
      await buscarComIA(nomeOcr, index);
    } else {
      setSugestoes(prev => new Map(prev).set(index, produtosFiltrados.slice(0, 5)));
    }
  };

  const buscarComIA = async (nomeOcr: string, index: number) => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/busca-produto-inteligente`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ busca: nomeOcr }),
      });

      if (response.ok) {
        const { produto_ids } = await response.json();
        const produtosSugeridos = produtos.filter(p => produto_ids.includes(p.id));
        setSugestoes(prev => new Map(prev).set(index, produtosSugeridos));
      }
    } catch (error) {
      console.error('Erro na busca IA:', error);
    }
  };

  const vincularProduto = async (index: number, produto: Produto | null) => {
    const novosItens = [...itens];
    novosItens[index].product_id = produto?.id || null;
    novosItens[index].needs_confirmation = false;
    setItens(novosItens);

    if (produto) {
      await supabase.from('product_mappings').upsert({
        nome_ocr: itens[index].nome.toLowerCase().trim(),
        product_id: produto.id,
        confidence: 1.0,
        confirmed_by_user: true,
        times_used: 1,
      }, { onConflict: 'nome_ocr' });
    }
  };

  const criarNovoProduto = async (index: number) => {
    const nomeItem = itens[index].nome;
    const nomeLimpo = prompt(`Criar novo produto.\nNome sugerido: ${nomeItem}\n\nEdite se necessário:`, nomeItem);

    if (!nomeLimpo) return;

    const categoria = prompt('Categoria do produto:', 'Geral');

    const { data: novoProduto, error } = await supabase
      .from('products')
      .insert({
        nome: nomeLimpo,
        categoria: categoria || 'Geral',
        aliases: [nomeItem.toLowerCase()],
      })
      .select()
      .single();

    if (!error && novoProduto) {
      setProdutos([...produtos, novoProduto]);
      await vincularProduto(index, novoProduto);
    }
  };

  const handleSalvar = async () => {
    setSalvando(true);

    try {
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          data: dadosCupom.data,
          fornecedor: dadosCupom.fornecedor,
          numero_nota: dadosCupom.numero_nota,
          valor_total: dadosCupom.valor_total,
          url_cupom: urlImagem,
          status: 'confirmed'
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      const itensParaInserir = itens.map(item => ({
        purchase_id: purchase.id,
        nome_ocr: item.nome,
        product_id: item.product_id,
        quantidade: item.quantidade,
        unidade: item.unidade,
        preco_unitario: item.preco_unitario,
        preco_total: item.preco_total,
        needs_review: !item.product_id
      }));

      const { error: itensError } = await supabase
        .from('purchase_items')
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      onConfirmar();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const itensVinculados = itens.filter(i => i.product_id).length;
  const totalItens = itens.length;
  const progresso = (itensVinculados / totalItens) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold mb-2">Vincular Produtos</h1>
                <p className="text-blue-100">{dadosCupom.fornecedor} - {new Date(dadosCupom.data).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{itensVinculados}/{totalItens}</div>
                <div className="text-blue-100 text-sm">produtos vinculados</div>
              </div>
            </div>

            <div className="w-full bg-blue-800 rounded-full h-3 overflow-hidden">
              <div
                className="bg-green-400 h-full transition-all duration-500"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>

          <div className="p-6 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
            {itens.map((item, index) => {
              const produtoVinculado = produtos.find(p => p.id === item.product_id);
              const sugestoesItem = sugestoes.get(index) || [];

              return (
                <div
                  key={index}
                  className={`border-2 rounded-xl p-5 transition-all ${
                    item.product_id
                      ? 'border-green-300 bg-green-50'
                      : 'border-orange-300 bg-orange-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.product_id ? 'bg-green-500' : 'bg-orange-500'
                    }`}>
                      {item.product_id ? (
                        <Check className="text-white" size={20} />
                      ) : (
                        <AlertCircle className="text-white" size={20} />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-sm text-slate-500 mb-1">Nome no cupom:</div>
                          <div className="font-bold text-slate-800 text-lg">{item.nome}</div>
                          <div className="text-sm text-slate-600 mt-1">
                            {item.quantidade} {item.unidade} × R$ {item.preco_unitario.toFixed(2)} = R$ {item.preco_total.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {produtoVinculado ? (
                        <div className="bg-white rounded-lg p-4 border-2 border-green-400">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Package className="text-green-600" size={24} />
                              <div>
                                <div className="font-semibold text-slate-800">{produtoVinculado.nome}</div>
                                <div className="text-sm text-slate-500">{produtoVinculado.categoria}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => vincularProduto(index, null)}
                              className="text-slate-400 hover:text-red-600 transition-colors p-2"
                            >
                              <X size={20} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {sugestoesItem.length > 0 ? (
                            <>
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Sparkles size={16} className="text-blue-500" />
                                Sugestões inteligentes:
                              </div>
                              <div className="space-y-2">
                                {sugestoesItem.map(produto => (
                                  <button
                                    key={produto.id}
                                    onClick={() => vincularProduto(index, produto)}
                                    className="w-full bg-white hover:bg-blue-50 border-2 border-slate-200 hover:border-blue-400 rounded-lg p-3 text-left transition-all flex items-center justify-between group"
                                  >
                                    <div className="flex items-center gap-3">
                                      <Package className="text-blue-600" size={20} />
                                      <div>
                                        <div className="font-medium text-slate-800">{produto.nome}</div>
                                        <div className="text-xs text-slate-500">{produto.categoria}</div>
                                      </div>
                                    </div>
                                    <ArrowRight className="text-slate-400 group-hover:text-blue-600 transition-colors" size={20} />
                                  </button>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="text-sm text-slate-500 italic">
                              Nenhuma sugestão encontrada
                            </div>
                          )}

                          <button
                            onClick={() => criarNovoProduto(index)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-3 font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <Package size={20} />
                            Criar novo produto
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-200 p-6 bg-slate-50">
            <div className="flex justify-between items-center">
              <button
                onClick={onCancelar}
                disabled={salvando}
                className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>

              <div className="flex gap-3">
                <button
                  onClick={handleSalvar}
                  disabled={salvando}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {salvando ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      Salvar {itensVinculados < totalItens && '(vincular depois)'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {itensVinculados < totalItens && (
              <p className="text-xs text-slate-500 mt-3 text-center">
                Você pode salvar agora e vincular os produtos restantes depois
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
