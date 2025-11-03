import { useEffect, useState } from 'react';
import { TrendingUp, Package, Calendar, ShoppingCart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface KPIData {
  gastoSemana: number;
  totalCompras: number;
}

interface Bill {
  id: string;
  due_date: string;
  issuer_name: string;
  amount: number;
  status: string;
}

interface Purchase {
  id: string;
  date: string;
  supplier_name_raw: string;
  invoice_number: string | null;
  status: string;
}

interface WeeklyData {
  semana: string;
  totalCompras: number;
  totalBoletos: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KPIData>({ gastoSemana: 0, totalCompras: 0 });
  const [bills, setBills] = useState<Bill[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const hoje = new Date();
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 6);

      const { data: purchaseItems } = await supabase
        .from('purchase_items')
        .select('total_cost, weight_kg, product_name_normalized, purchase_id')
        .eq('user_id', user?.id)
        .gte('created_at', inicioSemana.toISOString())
        .lte('created_at', fimSemana.toISOString());

      const gastoSemana = purchaseItems?.reduce((sum, item) => sum + Number(item.total_cost), 0) || 0;

      const uniquePurchases = new Set(purchaseItems?.map(item => item.purchase_id));
      const totalCompras = uniquePurchases.size;

      setKpis({ gastoSemana, totalCompras });

      const proximos7Dias = new Date();
      proximos7Dias.setDate(hoje.getDate() + 7);

      const { data: billsData } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'scheduled')
        .gte('due_date', hoje.toISOString().split('T')[0])
        .lte('due_date', proximos7Dias.toISOString().split('T')[0])
        .order('due_date', { ascending: true })
        .limit(5);

      setBills(billsData || []);

      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .limit(5);

      setPurchases(purchasesData || []);

      const oitoSemanasAtras = new Date();
      oitoSemanasAtras.setDate(hoje.getDate() - 56);

      const [purchasesWeekly, billsWeekly] = await Promise.all([
        supabase
          .from('purchases')
          .select('date, total_amount')
          .eq('user_id', user?.id)
          .gte('date', oitoSemanasAtras.toISOString().split('T')[0]),

        supabase
          .from('bills')
          .select('due_date, amount')
          .eq('user_id', user?.id)
          .gte('due_date', oitoSemanasAtras.toISOString().split('T')[0])
      ]);

      const weeklyMap: { [key: string]: { compras: number; boletos: number } } = {};

      purchasesWeekly.data?.forEach((purchase) => {
        const date = new Date(purchase.date + 'T00:00:00');
        const weekStart = new Date(date);
        const dayOfWeek = weekStart.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(weekStart.getDate() + diff);
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyMap[weekKey]) {
          weeklyMap[weekKey] = { compras: 0, boletos: 0 };
        }
        weeklyMap[weekKey].compras += Number(purchase.total_amount) || 0;
      });

      billsWeekly.data?.forEach((bill) => {
        const date = new Date(bill.due_date + 'T00:00:00');
        const weekStart = new Date(date);
        const dayOfWeek = weekStart.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(weekStart.getDate() + diff);
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyMap[weekKey]) {
          weeklyMap[weekKey] = { compras: 0, boletos: 0 };
        }
        weeklyMap[weekKey].boletos += Number(bill.amount) || 0;
      });

      const weeklyArray = Object.entries(weeklyMap)
        .map(([week, data]) => ({
          semana: new Date(week).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          totalCompras: data.compras,
          totalBoletos: data.boletos,
        }))
        .sort((a, b) => a.semana.localeCompare(b.semana));

      setWeeklyData(weeklyArray);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Gasto da Semana</p>
              <p className="text-2xl font-bold text-gray-800">
                R$ {kpis.gastoSemana.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <Package className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Compras da Semana</p>
              <p className="text-2xl font-bold text-gray-800">
                {kpis.totalCompras}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">Boletos Próximos 7 dias</h2>
          </div>

          {bills.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhum boleto agendado</p>
          ) : (
            <div className="space-y-3">
              {bills.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{bill.issuer_name}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(bill.due_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-800">R$ {Number(bill.amount).toFixed(2)}</p>
                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                      {bill.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">Compras Recentes</h2>
          </div>

          {purchases.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhuma compra registrada</p>
          ) : (
            <div className="space-y-3">
              {purchases.map((purchase) => (
                <div key={purchase.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{purchase.supplier_name_raw}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(purchase.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{purchase.invoice_number || 'S/N'}</p>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                      {purchase.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Valor Total de Compras por Semana
          </h2>

          {weeklyData.length === 0 ? (
            <p className="text-gray-500 text-sm">Sem dados de compras</p>
          ) : (
            <div className="space-y-3">
              {weeklyData.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 w-16">{item.semana}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-10 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-400 to-green-600 h-full flex items-center justify-end px-3"
                      style={{ width: `${Math.min((item.totalCompras / 500) * 100, 100)}%` }}
                    >
                      {item.totalCompras > 0 && (
                        <span className="text-sm font-medium text-white">
                          R$ {item.totalCompras.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Valor Total de Boletos por Semana
          </h2>

          {weeklyData.length === 0 ? (
            <p className="text-gray-500 text-sm">Sem dados de boletos</p>
          ) : (
            <div className="space-y-3">
              {weeklyData.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 w-16">{item.semana}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-10 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-orange-400 to-orange-600 h-full flex items-center justify-end px-3"
                      style={{ width: `${Math.min((item.totalBoletos / 500) * 100, 100)}%` }}
                    >
                      {item.totalBoletos > 0 && (
                        <span className="text-sm font-medium text-white">
                          R$ {item.totalBoletos.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
