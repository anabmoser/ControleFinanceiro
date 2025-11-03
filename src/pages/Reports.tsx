import { useState, useEffect } from 'react';
import { FileDown, Filter, TrendingUp, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ReportData {
  produto?: string;
  data?: string;
  fornecedor?: string;
  quantidade?: string;
  preco_unitario?: string;
  total?: string;
  nota_fiscal?: string;
  vezes_comprado?: number;
  quantidade_total?: string;
  total_gasto?: string;
}

export function Reports() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState<'products' | 'suppliers' | 'top-products'>('products');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [products, setProducts] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFilters();
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  const loadFilters = async () => {
    if (!user) return;

    const { data: itemsData } = await supabase
      .from('purchase_items')
      .select('product_name_normalized, name_ocr')
      .eq('user_id', user.id);

    const { data: purchasesData } = await supabase
      .from('purchases')
      .select('supplier_name_raw')
      .eq('user_id', user.id);

    const uniqueProducts = [...new Set(
      itemsData?.map(item => item.product_name_normalized || item.name_ocr).filter(Boolean) || []
    )].sort();

    const uniqueSuppliers = [...new Set(
      purchasesData?.map(p => p.supplier_name_raw).filter(Boolean) || []
    )].sort();

    setProducts(uniqueProducts);
    setSuppliers(uniqueSuppliers);
  };

  const generateReport = async () => {
    if (!user || !startDate || !endDate) return;

    setLoading(true);
    try {
      if (reportType === 'products') {
        await generateProductsReport();
      } else if (reportType === 'suppliers') {
        await generateSuppliersReport();
      } else if (reportType === 'top-products') {
        await generateTopProductsReport();
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateProductsReport = async () => {
    let query = supabase
      .from('purchase_items')
      .select(`
        product_name_normalized,
        name_ocr,
        weight_kg,
        quantity,
        unit,
        unit_price,
        total_cost,
        created_at,
        purchases!inner(date, supplier_name_raw)
      `)
      .eq('user_id', user!.id)
      .gte('created_at', new Date(startDate).toISOString())
      .lte('created_at', new Date(endDate + 'T23:59:59').toISOString());

    if (selectedProduct) {
      query = query.or(`product_name_normalized.ilike.%${selectedProduct}%,name_ocr.ilike.%${selectedProduct}%`);
    }

    const { data: items } = await query;

    if (!items || items.length === 0) {
      setReportData([]);
      setTotalAmount(0);
      return;
    }

    const tableData = items.map(item => ({
      produto: item.product_name_normalized || item.name_ocr,
      data: new Date(item.purchases.date).toLocaleDateString('pt-BR'),
      fornecedor: item.purchases.supplier_name_raw,
      quantidade: item.weight_kg ? `${item.weight_kg} kg` : `${item.quantity} ${item.unit}`,
      preco_unitario: `R$ ${Number(item.unit_price).toFixed(2)}`,
      total: `R$ ${Number(item.total_cost).toFixed(2)}`
    }));

    const total = items.reduce((sum, item) => sum + Number(item.total_cost), 0);

    setReportData(tableData);
    setTotalAmount(total);
  };

  const generateSuppliersReport = async () => {
    let purchasesQuery = supabase
      .from('purchases')
      .select('id, date, supplier_name_raw, invoice_number, total_amount')
      .eq('user_id', user!.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (selectedSupplier) {
      purchasesQuery = purchasesQuery.ilike('supplier_name_raw', `%${selectedSupplier}%`);
    }

    const { data: purchases } = await purchasesQuery;

    if (!purchases || purchases.length === 0) {
      setReportData([]);
      setTotalAmount(0);
      return;
    }

    const tableData = purchases.map(purchase => ({
      data: new Date(purchase.date).toLocaleDateString('pt-BR'),
      fornecedor: purchase.supplier_name_raw,
      nota_fiscal: purchase.invoice_number || '-',
      total: `R$ ${Number(purchase.total_amount || 0).toFixed(2)}`
    }));

    const total = purchases.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);

    setReportData(tableData);
    setTotalAmount(total);
  };

  const generateTopProductsReport = async () => {
    const { data: items } = await supabase
      .from('purchase_items')
      .select('product_name_normalized, name_ocr, weight_kg, quantity, total_cost')
      .eq('user_id', user!.id)
      .gte('created_at', new Date(startDate).toISOString())
      .lte('created_at', new Date(endDate + 'T23:59:59').toISOString());

    if (!items || items.length === 0) {
      setReportData([]);
      setTotalAmount(0);
      return;
    }

    const productSummary: { [key: string]: { kg: number; un: number; total: number; count: number } } = {};

    items.forEach(item => {
      const name = item.product_name_normalized || item.name_ocr;
      if (!productSummary[name]) {
        productSummary[name] = { kg: 0, un: 0, total: 0, count: 0 };
      }
      productSummary[name].kg += Number(item.weight_kg) || 0;
      productSummary[name].un += Number(item.quantity) || 0;
      productSummary[name].total += Number(item.total_cost) || 0;
      productSummary[name].count += 1;
    });

    const tableData = Object.entries(productSummary)
      .map(([name, data]) => ({
        produto: name,
        vezes_comprado: data.count,
        quantidade_total: data.kg > 0 ? `${data.kg.toFixed(2)} kg` : `${data.un} un`,
        total_gasto: `R$ ${data.total.toFixed(2)}`
      }))
      .sort((a, b) => b.vezes_comprado - a.vezes_comprado);

    const total = items.reduce((sum, item) => sum + Number(item.total_cost), 0);

    setReportData(tableData);
    setTotalAmount(total);
  };

  const exportToCSV = () => {
    if (reportData.length === 0) return;

    const headers = Object.keys(reportData[0]);
    const csvContent = [
      headers.join(','),
      ...reportData.map(row =>
        headers.map(header => {
          const value = row[header as keyof ReportData];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Relatórios</h1>
        {reportData.length > 0 && (
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            <FileDown className="w-5 h-5" />
            Exportar CSV
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-800">Filtros</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Relatório
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="products">Produtos</option>
              <option value="suppliers">Fornecedores</option>
              <option value="top-products">Top Produtos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {reportType === 'products' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Produto (opcional)
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os produtos</option>
                {products.map(product => (
                  <option key={product} value={product}>{product}</option>
                ))}
              </select>
            </div>
          )}

          {reportType === 'suppliers' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fornecedor (opcional)
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os fornecedores</option>
                {suppliers.map(supplier => (
                  <option key={supplier} value={supplier}>{supplier}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <button
          onClick={generateReport}
          disabled={loading || !startDate || !endDate}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <TrendingUp className="w-5 h-5" />
          {loading ? 'Gerando relatório...' : 'Gerar Relatório'}
        </button>
      </div>

      {reportData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Resultados</h2>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-sm text-gray-600">Total de registros</p>
                <p className="text-2xl font-bold text-gray-800">{reportData.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Valor Total</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(reportData[0]).map((key) => (
                    <th
                      key={key}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    {Object.values(row).map((value: any, cellIdx) => (
                      <td key={cellIdx} className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && reportData.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            Selecione os filtros e clique em "Gerar Relatório" para visualizar os dados.
          </p>
        </div>
      )}
    </div>
  );
}
