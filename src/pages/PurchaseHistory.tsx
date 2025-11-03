import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingCart, Calendar, DollarSign, Package, ChevronDown, ChevronUp } from 'lucide-react';

interface PurchaseItem {
  id: string;
  name_ocr: string;
  product_name_normalized: string | null;
  unit: string;
  quantity: number | null;
  weight_kg: number | null;
  unit_price: number;
  discount: number;
  total_cost: number;
}

interface Purchase {
  id: string;
  date: string;
  supplier_name_raw: string;
  invoice_number: string | null;
  payment_method: string | null;
  total_amount: number | null;
  receipt_url: string | null;
  status: string;
  items?: PurchaseItem[];
}

export default function PurchaseHistory() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('all');

  useEffect(() => {
    if (user) {
      loadPurchases();
    }
  }, [user, period]);

  const loadPurchases = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('date', weekAgo.toISOString().split('T')[0]);
      } else if (period === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('date', monthAgo.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Erro ao carregar compras:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPurchaseItems = async (purchaseId: string) => {
    try {
      const { data, error } = await supabase
        .from('purchase_items')
        .select('*')
        .eq('purchase_id', purchaseId)
        .order('name_ocr');

      if (error) throw error;

      setPurchases(prev =>
        prev.map(p =>
          p.id === purchaseId ? { ...p, items: data || [] } : p
        )
      );
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    }
  };

  const toggleExpand = (purchaseId: string) => {
    if (expandedPurchase === purchaseId) {
      setExpandedPurchase(null);
    } else {
      setExpandedPurchase(purchaseId);
      const purchase = purchases.find(p => p.id === purchaseId);
      if (purchase && !purchase.items) {
        loadPurchaseItems(purchaseId);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const calculateTotalItems = (items?: PurchaseItem[]) => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + item.total_cost, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando histórico...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Histórico de Compras
        </h1>
        <p className="text-gray-600">
          Visualize todas as suas compras e detalhes dos produtos
        </p>
      </div>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setPeriod('week')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            period === 'week'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Última Semana
        </button>
        <button
          onClick={() => setPeriod('month')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            period === 'month'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Último Mês
        </button>
        <button
          onClick={() => setPeriod('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            period === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todas
        </button>
      </div>

      {purchases.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhuma compra encontrada
          </h3>
          <p className="text-gray-600">
            Faça upload de cupons fiscais para começar a rastrear suas compras
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {purchases.map((purchase) => {
            const isExpanded = expandedPurchase === purchase.id;
            const itemsTotal = calculateTotalItems(purchase.items);
            const displayTotal = purchase.total_amount || itemsTotal;

            return (
              <div
                key={purchase.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden"
              >
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(purchase.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <ShoppingCart className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {purchase.supplier_name_raw}
                        </h3>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(purchase.date)}
                        </div>
                        {purchase.payment_method && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {purchase.payment_method}
                          </div>
                        )}
                        {purchase.invoice_number && (
                          <div className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            NF: {purchase.invoice_number}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(displayTotal)}
                        </div>
                        {purchase.items && (
                          <div className="text-sm text-gray-600">
                            {purchase.items.length}{' '}
                            {purchase.items.length === 1 ? 'item' : 'itens'}
                          </div>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 p-6">
                    {purchase.items ? (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 mb-4">
                          Itens da Compra
                        </h4>
                        {purchase.items.map((item) => (
                          <div
                            key={item.id}
                            className="bg-white rounded-lg p-4 flex justify-between items-start"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {item.name_ocr}
                              </div>
                              {item.product_name_normalized && (
                                <div className="text-sm text-blue-600">
                                  Produto: {item.product_name_normalized}
                                </div>
                              )}
                              <div className="text-sm text-gray-600 mt-1">
                                {item.quantity
                                  ? `${item.quantity} ${item.unit}`
                                  : item.weight_kg
                                  ? `${item.weight_kg} kg`
                                  : '1 un'}{' '}
                                × {formatCurrency(item.unit_price)}
                                {item.discount > 0 && (
                                  <span className="text-green-600 ml-2">
                                    (desconto: {formatCurrency(item.discount)})
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-gray-900">
                                {formatCurrency(item.total_cost)}
                              </div>
                            </div>
                          </div>
                        ))}
                        {purchase.receipt_url && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <a
                              href={purchase.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              Ver Cupom Original →
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-gray-600">
                        Carregando itens...
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
