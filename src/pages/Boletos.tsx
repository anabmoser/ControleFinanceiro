import { useState, useEffect } from 'react';
import { FileText, CheckCircle } from 'lucide-react';
import { supabase, Bill } from '../lib/supabase';

export function Boletos() {
  const [boletos, setBoletos] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarBoletos();
  }, []);

  const carregarBoletos = async () => {
    try {
      const { data } = await supabase
        .from('bills')
        .select('*')
        .order('vencimento', { ascending: true });

      setBoletos(data || []);
    } catch (error) {
      console.error('Erro ao carregar boletos:', error);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoPago = async (id: string) => {
    try {
      await supabase
        .from('bills')
        .update({ status: 'paid' })
        .eq('id', id);

      carregarBoletos();
    } catch (error) {
      console.error('Erro ao atualizar boleto:', error);
    }
  };

  const boletosPendentes = boletos.filter(b => b.status === 'pending');
  const boletosPagos = boletos.filter(b => b.status === 'paid');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Boletos</h2>
        <p className="text-gray-600">
          Gerencie seus boletos e pagamentos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Pendentes ({boletosPendentes.length})
            </h3>
          </div>

          <div className="space-y-3">
            {boletosPendentes.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Nenhum boleto pendente
              </p>
            ) : (
              boletosPendentes.map((boleto) => {
                const hoje = new Date();
                const vencimento = new Date(boleto.vencimento);
                const diasRestantes = Math.ceil(
                  (vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
                );
                const vencido = diasRestantes < 0;

                return (
                  <div
                    key={boleto.id}
                    className={`p-4 rounded-lg border-2 ${
                      vencido
                        ? 'border-red-200 bg-red-50'
                        : diasRestantes <= 3
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-800">{boleto.emissor}</h4>
                        <p className="text-sm text-gray-600">
                          Vence em {vencimento.toLocaleDateString('pt-BR')}
                        </p>
                        {vencido && (
                          <p className="text-xs text-red-600 font-medium mt-1">
                            Vencido há {Math.abs(diasRestantes)} dias
                          </p>
                        )}
                        {!vencido && diasRestantes <= 3 && (
                          <p className="text-xs text-amber-600 font-medium mt-1">
                            Vence em {diasRestantes} dias
                          </p>
                        )}
                      </div>
                      <p className="text-lg font-bold text-gray-800">
                        R$ {Number(boleto.valor).toFixed(2)}
                      </p>
                    </div>

                    {boleto.codigo_barras && (
                      <p className="text-xs text-gray-500 font-mono mb-3">
                        {boleto.codigo_barras}
                      </p>
                    )}

                    <button
                      onClick={() => marcarComoPago(boleto.id)}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Marcar como Pago
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              Pagos ({boletosPagos.length})
            </h3>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {boletosPagos.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Nenhum boleto pago
              </p>
            ) : (
              boletosPagos.map((boleto) => (
                <div
                  key={boleto.id}
                  className="p-4 rounded-lg bg-gray-50 border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-800">{boleto.emissor}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(boleto.vencimento).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">
                        R$ {Number(boleto.valor).toFixed(2)}
                      </p>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                        Pago
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
