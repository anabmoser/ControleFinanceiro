import { useState, useEffect } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { supabase, Product } from '../lib/supabase';

interface Mensagem {
  tipo: 'bot' | 'usuario';
  texto: string;
  opcoes?: { texto: string; acao: () => void }[];
}

export function ChatAprendizado() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      tipo: 'bot',
      texto: 'Olá! Sou seu assistente para ajudar a identificar produtos. Quando você escanear um cupom, vou te ajudar a associar os itens ao catálogo.'
    }
  ]);
  const [entrada, setEntrada] = useState('');

  const verificarProdutosPendentes = async () => {
    const { data: itensSemProduto } = await supabase
      .from('purchase_items')
      .select('*, purchases!inner(*)')
      .is('product_id', null)
      .eq('purchases.status', 'pending_review')
      .limit(1);

    if (itensSemProduto && itensSemProduto.length > 0) {
      const item = itensSemProduto[0];
      perguntarSobreProduto(item.nome_ocr, item.id);
    }
  };

  const perguntarSobreProduto = async (nomeOCR: string, itemId: string) => {
    const { data: produtosSimilares } = await supabase
      .from('products')
      .select('*')
      .or(`nome.ilike.%${nomeOCR}%`)
      .limit(5);

    if (produtosSimilares && produtosSimilares.length > 0) {
      const opcoes = produtosSimilares.map(produto => ({
        texto: `${produto.nome} (${produto.categoria})`,
        acao: () => associarProduto(itemId, produto.id, nomeOCR, produto)
      }));

      opcoes.push({
        texto: 'Criar novo produto',
        acao: () => solicitarCriacaoNovoProduto(nomeOCR, itemId)
      });

      setMensagens(prev => [...prev, {
        tipo: 'bot',
        texto: `Encontrei "${nomeOCR}" no cupom. Este produto é similar a algum destes?`,
        opcoes
      }]);

      setAberto(true);
    } else {
      setMensagens(prev => [...prev, {
        tipo: 'bot',
        texto: `Produto "${nomeOCR}" não encontrado no catálogo. Deseja cadastrá-lo?`,
        opcoes: [
          {
            texto: 'Sim, cadastrar',
            acao: () => solicitarCriacaoNovoProduto(nomeOCR, itemId)
          },
          {
            texto: 'Ignorar por enquanto',
            acao: () => {
              setMensagens(prev => [...prev, {
                tipo: 'bot',
                texto: 'Ok, você pode cadastrar depois na tela de produtos.'
              }]);
            }
          }
        ]
      }]);

      setAberto(true);
    }
  };

  const associarProduto = async (itemId: string, productId: string, nomeOriginal: string, produto: Product) => {
    await supabase
      .from('purchase_items')
      .update({ product_id: productId })
      .eq('id', itemId);

    await supabase
      .from('product_learning')
      .insert({
        nome_original: nomeOriginal,
        product_id: productId,
        confirmado_por_usuario: true
      });

    const nomeLimpo = nomeOriginal.toLowerCase().trim();
    if (!produto.aliases.includes(nomeLimpo) && produto.nome.toLowerCase() !== nomeLimpo) {
      const novosAliases = [...produto.aliases, nomeLimpo];
      await supabase
        .from('products')
        .update({ aliases: novosAliases })
        .eq('id', productId);
    }

    setMensagens(prev => [...prev, {
      tipo: 'usuario',
      texto: `Associado a ${produto.nome}`
    }, {
      tipo: 'bot',
      texto: `Ótimo! Agora quando "${nomeOriginal}" aparecer novamente, vou associar automaticamente a ${produto.nome}.`
    }]);

    setTimeout(() => verificarProdutosPendentes(), 2000);
  };

  const solicitarCriacaoNovoProduto = (nomeOCR: string, itemId: string) => {
    setMensagens(prev => [...prev, {
      tipo: 'bot',
      texto: `Qual categoria para "${nomeOCR}"?`,
      opcoes: [
        { texto: 'Legumes', acao: () => criarNovoProduto(nomeOCR, 'Legumes', itemId) },
        { texto: 'Carnes', acao: () => criarNovoProduto(nomeOCR, 'Carnes', itemId) },
        { texto: 'Grãos', acao: () => criarNovoProduto(nomeOCR, 'Grãos', itemId) },
        { texto: 'Bebidas', acao: () => criarNovoProduto(nomeOCR, 'Bebidas', itemId) },
        { texto: 'Mercearia', acao: () => criarNovoProduto(nomeOCR, 'Mercearia', itemId) },
        { texto: 'Temperos', acao: () => criarNovoProduto(nomeOCR, 'Temperos', itemId) },
        { texto: 'Laticínios', acao: () => criarNovoProduto(nomeOCR, 'Laticínios', itemId) },
      ]
    }]);
  };

  const criarNovoProduto = async (nome: string, categoria: string, itemId: string) => {
    const { data: novoProduto } = await supabase
      .from('products')
      .insert({
        nome,
        categoria,
        unidade: 'kg'
      })
      .select()
      .single();

    if (novoProduto) {
      await supabase
        .from('purchase_items')
        .update({ product_id: novoProduto.id })
        .eq('id', itemId);

      setMensagens(prev => [...prev, {
        tipo: 'usuario',
        texto: `Criar na categoria ${categoria}`
      }, {
        tipo: 'bot',
        texto: `Produto "${nome}" cadastrado com sucesso na categoria ${categoria}!`
      }]);

      setTimeout(() => verificarProdutosPendentes(), 2000);
    }
  };

  useEffect(() => {
    if (aberto) {
      verificarProdutosPendentes();
    }
  }, [aberto]);

  return (
    <>
      <button
        onClick={() => setAberto(!aberto)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition z-40"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {aberto && (
        <div className="fixed bottom-24 right-6 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col" style={{ height: '500px' }}>
          <div className="p-4 bg-blue-600 text-white rounded-t-xl flex items-center justify-between">
            <h3 className="font-semibold">Assistente de Produtos</h3>
            <button
              onClick={() => setAberto(false)}
              className="hover:bg-blue-700 p-1 rounded transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {mensagens.map((msg, index) => (
              <div key={index}>
                <div
                  className={`p-3 rounded-lg ${
                    msg.tipo === 'bot'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-blue-600 text-white ml-auto max-w-[80%]'
                  }`}
                >
                  {msg.texto}
                </div>

                {msg.opcoes && (
                  <div className="mt-2 space-y-2">
                    {msg.opcoes.map((opcao, i) => (
                      <button
                        key={i}
                        onClick={opcao.acao}
                        className="block w-full text-left px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                      >
                        {opcao.texto}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                type="text"
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && entrada.trim()) {
                    setMensagens(prev => [...prev, {
                      tipo: 'usuario',
                      texto: entrada
                    }, {
                      tipo: 'bot',
                      texto: 'Desculpe, ainda estou aprendendo. Use as opções acima.'
                    }]);
                    setEntrada('');
                  }
                }}
                placeholder="Digite uma mensagem..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  if (entrada.trim()) {
                    setMensagens(prev => [...prev, {
                      tipo: 'usuario',
                      texto: entrada
                    }, {
                      tipo: 'bot',
                      texto: 'Desculpe, ainda estou aprendendo. Use as opções acima.'
                    }]);
                    setEntrada('');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
