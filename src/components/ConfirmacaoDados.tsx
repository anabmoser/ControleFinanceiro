import { useState } from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';
import { supabase, Purchase, PurchaseItem, Product } from '../lib/supabase';

interface DadosOCR {
  fornecedor: string;
  numero_nota: string;
  data: string;
  valor_total: number;
  itens: {
    nome: string;
    quantidade: number;
    unidade: string;
    preco_unitario: number;
    preco_total: number;
  }[];
}

interface Props {
  dadosOCR: DadosOCR;
  urlImagem: string;
  onConfirmar: (purchase: Purchase) => void;
  onRejeitar: () => void;
}

export function ConfirmacaoDados({ dadosOCR, urlImagem, onConfirmar, onRejeitar }: Props) {
  const [editando, setEditando] = useState<DadosOCR>(dadosOCR);
  const [salvando, setSalvando] = useState(false);
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [produtosSugeridos, setProdutosSugeridos] = useState<Map<number, Product[]>>(new Map());

  const buscarProdutosSimilares = async (nomeItem: string, index: number) => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .or(`nome.ilike.%${nomeItem}%,aliases.cs.{${nomeItem}}`);

    if (data) {
      setProdutosSugeridos(prev => new Map(prev).set(index, data));
    }
  };

  const handleConfirmar = async () => {
    setSalvando(true);

    try {
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert({
          data: editando.data,
          fornecedor: editando.fornecedor,
          numero_nota: editando.numero_nota,
          valor_total: editando.valor_total,
          url_cupom: urlImagem,
          status: 'confirmed'
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      const itensParaInserir = editando.itens.map(item => ({
        purchase_id: purchase.id,
        nome_ocr: item.nome,
        quantidade: item.quantidade,
        unidade: item.unidade,
        preco_unitario: item.preco_unitario,
        preco_total: item.preco_total,
        needs_review: false
      }));

      const { error: itensError } = await supabase
        .from('purchase_items')
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      onConfirmar(purchase);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar dados. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const handleEditarCampo = (campo: keyof DadosOCR, valor: any) => {
    setEditando(prev => ({ ...prev, [campo]: valor }));
  };

  const handleEditarItem = (index: number, campo: string, valor: any) => {
    const novosItens = [...editando.itens];
    novosItens[index] = { ...novosItens[index], [campo]: valor };

    if (campo === 'quantidade' || campo === 'preco_unitario') {
      const item = novosItens[index];
      item.preco_total = item.quantidade * item.preco_unitario;
    }

    setEditando(prev => ({
      ...prev,
      itens: novosItens,
      valor_total: novosItens.reduce((sum, item) => sum + item.preco_total, 0)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full my-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <h2 className="text-2xl font-bold text-gray-800">
                Confirme os Dados Extraídos
              </h2>
            </div>
            <button
              onClick={onRejeitar}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Revise e corrija os dados antes de salvar no banco de dados
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-lg mb-4">Imagem do Cupom</h3>
            <img
              src={urlImagem}
              alt="Cupom fiscal"
              className="w-full rounded-lg border border-gray-200"
            />
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-4">Dados da Compra</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fornecedor
                  </label>
                  <input
                    type="text"
                    value={editando.fornecedor}
                    onChange={(e) => handleEditarCampo('fornecedor', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número da Nota
                    </label>
                    <input
                      type="text"
                      value={editando.numero_nota}
                      onChange={(e) => handleEditarCampo('numero_nota', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      value={editando.data}
                      onChange={(e) => handleEditarCampo('data', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Total
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editando.valor_total}
                    onChange={(e) => handleEditarCampo('valor_total', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4">Itens da Compra</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {editando.itens.map((item, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Produto
                      </label>
                      <input
                        type="text"
                        value={item.nome}
                        onChange={(e) => handleEditarItem(index, 'nome', e.target.value)}
                        onBlur={() => buscarProdutosSimilares(item.nome, index)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      {produtosSugeridos.get(index) && produtosSugeridos.get(index)!.length > 0 && (
                        <div className="mt-1 text-xs text-gray-600">
                          Sugestões: {produtosSugeridos.get(index)!.map(p => p.nome).join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Qtd
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={item.quantidade}
                          onChange={(e) => handleEditarItem(index, 'quantidade', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Un
                        </label>
                        <input
                          type="text"
                          value={item.unidade}
                          onChange={(e) => handleEditarItem(index, 'unidade', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Preço Un.
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.preco_unitario}
                          onChange={(e) => handleEditarItem(index, 'preco_unitario', parseFloat(e.target.value))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Total
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.preco_total.toFixed(2)}
                          disabled
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded bg-gray-100"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onRejeitar}
            disabled={salvando}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={salvando}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            {salvando ? 'Salvando...' : 'Confirmar e Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
