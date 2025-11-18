import { useState } from 'react';
import { ShoppingCart, Calendar, DollarSign, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { useAuth } from '../contexts/AuthContext';
import { useInfinitePurchases } from '../hooks/useInfiniteScroll';
import { usePurchaseItems } from '../hooks/useQueryHooks';

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

export default function PurchaseHistoryInfinite() {
  const { user } = useAuth();
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('all');

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfinitePurchases(user?.id, period);

  const { ref, inView } = useInView({
    threshold: 0,
    onChange: (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
  });

  const purchases = data?.pages.flatMap(page => page.purchases) || [];

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

  if (isLoading) {
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
          {purchases.map((purchase) => (
            <PurchaseCard
              key={purchase.id}
              purchase={purchase}
              isExpanded={expandedPurchase === purchase.id}
              onToggle={() => setExpandedPurchase(
                expandedPurchase === purchase.id ? null : purchase.id
              )}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
            />
          ))}

          {hasNextPage && (
            <div ref={ref} className="py-8 text-center">
              {isFetchingNextPage ? (
                <div className="text-gray-600">Carregando mais...</div>
              ) : (
                <div className="text-gray-400">Role para carregar mais</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PurchaseCard({
  purchase,
  isExpanded,
  onToggle,
  formatDate,
  formatCurrency,
}: {
  purchase: any;
  isExpanded: boolean;
  onToggle: () => void;
  formatDate: (date: string) => string;
  formatCurrency: (value: number) => string;
}) {
  const { data: items, isLoading } = usePurchaseItems(isExpanded ? purchase.id : undefined);

  const calculateTotalItems = (items: PurchaseItem[] | undefined) => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + item.total_cost, 0);
  };

  const itemsTotal = calculateTotalItems(items);
  const displayTotal = purchase.total_amount || itemsTotal;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
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
              {items && (
                <div className="text-sm text-gray-600">
                  {items.length} {items.length === 1 ? 'item' : 'itens'}
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
          {isLoading ? (
            <div className="text-center text-gray-600">Carregando itens...</div>
          ) : items && items.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 mb-4">Itens da Compra</h4>
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg p-4 flex justify-between items-start"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.name_ocr}</div>
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
            <div className="text-center text-gray-600">Nenhum item encontrado</div>
          )}
        </div>
      )}
    </div>
  );
}
