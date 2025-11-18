import { useEffect, useState } from 'react';
import { BarChart3, Users, ShoppingCart, TrendingUp, DollarSign, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AdminMetrics {
  totalUsers: number;
  totalPurchases: number;
  totalItems: number;
  totalSpent: number;
  avgPurchaseValue: number;
  topProducts: Array<{ name: string; count: number; total: number }>;
  topSuppliers: Array<{ name: string; count: number; total: number }>;
  monthlyTrend: Array<{ month: string; purchases: number; amount: number }>;
}

export function AdminDashboard() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');

  useEffect(() => {
    loadMetrics();
  }, [period]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const dateFilter = getDateFilter();

      const [usersData, purchasesData, itemsData, topProductsData, topSuppliersData] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),

        supabase
          .from('purchases')
          .select('id, date, total_amount')
          .gte('date', dateFilter),

        supabase
          .from('purchase_items')
          .select('total_cost, product_name_normalized')
          .gte('created_at', dateFilter),

        supabase.rpc('get_top_products', { days_ago: getPeriodDays() }),

        supabase.rpc('get_top_suppliers', { days_ago: getPeriodDays() })
      ]);

      const totalSpent = purchasesData.data?.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0) || 0;
      const avgPurchaseValue = purchasesData.data?.length ? totalSpent / purchasesData.data.length : 0;

      const monthlyMap: { [key: string]: { purchases: number; amount: number } } = {};
      purchasesData.data?.forEach(purchase => {
        const month = new Date(purchase.date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        if (!monthlyMap[month]) {
          monthlyMap[month] = { purchases: 0, amount: 0 };
        }
        monthlyMap[month].purchases += 1;
        monthlyMap[month].amount += Number(purchase.total_amount) || 0;
      });

      const monthlyTrend = Object.entries(monthlyMap).map(([month, data]) => ({
        month,
        purchases: data.purchases,
        amount: data.amount,
      })).sort((a, b) => a.month.localeCompare(b.month));

      setMetrics({
        totalUsers: usersData.count || 0,
        totalPurchases: purchasesData.data?.length || 0,
        totalItems: itemsData.data?.length || 0,
        totalSpent,
        avgPurchaseValue,
        topProducts: topProductsData.data || [],
        topSuppliers: topSuppliersData.data || [],
        monthlyTrend,
      });
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateFilter = () => {
    const now = new Date();
    switch (period) {
      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return weekAgo.toISOString().split('T')[0];
      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        return monthAgo.toISOString().split('T')[0];
      case 'year':
        const yearAgo = new Date(now);
        yearAgo.setFullYear(now.getFullYear() - 1);
        return yearAgo.toISOString().split('T')[0];
      default:
        return '2000-01-01';
    }
  };

  const getPeriodDays = () => {
    switch (period) {
      case 'week': return 7;
      case 'month': return 30;
      case 'year': return 365;
      default: return 9999;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando métricas...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Administrativo</h1>

        <div className="flex gap-2">
          {(['week', 'month', 'year', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : p === 'year' ? 'Ano' : 'Tudo'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={Users}
          title="Total de Usuários"
          value={metrics?.totalUsers || 0}
          color="blue"
        />
        <MetricCard
          icon={ShoppingCart}
          title="Total de Compras"
          value={metrics?.totalPurchases || 0}
          color="green"
        />
        <MetricCard
          icon={Package}
          title="Total de Itens"
          value={metrics?.totalItems || 0}
          color="orange"
        />
        <MetricCard
          icon={DollarSign}
          title="Gasto Total"
          value={formatCurrency(metrics?.totalSpent || 0)}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Valor Médio por Compra
          </h2>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(metrics?.avgPurchaseValue || 0)}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Tendência Mensal
          </h2>
          <div className="space-y-2">
            {metrics?.monthlyTrend.slice(-3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.month}</span>
                <div className="flex gap-4">
                  <span className="text-gray-800">{item.purchases} compras</span>
                  <span className="font-semibold text-green-600">{formatCurrency(item.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Top 10 Produtos</h2>
          <div className="space-y-3">
            {metrics?.topProducts.slice(0, 10).map((product, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{product.name}</div>
                  <div className="text-sm text-gray-600">{product.count} compras</div>
                </div>
                <div className="text-right font-semibold text-green-600">
                  {formatCurrency(product.total)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Top 10 Fornecedores</h2>
          <div className="space-y-3">
            {metrics?.topSuppliers.slice(0, 10).map((supplier, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{supplier.name}</div>
                  <div className="text-sm text-gray-600">{supplier.count} compras</div>
                </div>
                <div className="text-right font-semibold text-green-600">
                  {formatCurrency(supplier.total)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, title, value, color }: {
  icon: any;
  title: string;
  value: string | number;
  color: 'blue' | 'green' | 'orange' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
      </div>
    </div>
  );
}
