import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { question, userId } = await req.json();

    if (!question || !userId) {
      throw new Error('question e userId são obrigatórios');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const questionLower = question.toLowerCase();
    let answer = '';
    let data: any[] = [];

    if (
      (questionLower.includes('quantidade') || questionLower.includes('kg') || questionLower.includes('comprei')) &&
      (questionLower.includes('semana') || questionLower.includes('esta semana') || questionLower.includes('nesta semana'))
    ) {
      const productMatch = question.match(/(?:de |do |da )([\w\s]+?)(?:\s+(?:na|nesta|esta|semana|comprei)|$)/i);
      const productName = productMatch ? productMatch[1].trim() : null;

      const hoje = new Date();
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());
      inicioSemana.setHours(0, 0, 0, 0);

      let query = supabase
        .from('purchase_items')
        .select('weight_kg, quantity, unit, product_name_normalized, name_ocr, total_cost, created_at')
        .eq('user_id', userId)
        .gte('created_at', inicioSemana.toISOString());

      if (productName) {
        query = query.or(`product_name_normalized.ilike.%${productName}%,name_ocr.ilike.%${productName}%`);
      }

      const { data: items } = await query;

      const totalKg = items?.reduce((sum, item) => sum + (Number(item.weight_kg) || 0), 0) || 0;
      const totalUn = items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;

      if (productName) {
        answer = `Esta semana você comprou ${totalKg > 0 ? `${totalKg.toFixed(2)} kg` : ''}${totalKg > 0 && totalUn > 0 ? ' e ' : ''}${totalUn > 0 ? `${totalUn} unidades` : ''} de ${productName}.`;
      } else {
        const productSummary: { [key: string]: { kg: number; un: number; total: number } } = {};
        items?.forEach(item => {
          const name = item.product_name_normalized || item.name_ocr;
          if (!productSummary[name]) {
            productSummary[name] = { kg: 0, un: 0, total: 0 };
          }
          productSummary[name].kg += Number(item.weight_kg) || 0;
          productSummary[name].un += Number(item.quantity) || 0;
          productSummary[name].total += Number(item.total_cost) || 0;
        });

        const tableData = Object.entries(productSummary).map(([name, data]) => ({
          produto: name,
          quantidade: data.kg > 0 ? `${data.kg.toFixed(2)} kg` : `${data.un} un`,
          total: `R$ ${data.total.toFixed(2)}`
        }));

        answer = `Esta semana você comprou ${Object.keys(productSummary).length} produtos diferentes:`;
        data = tableData;
      }

      if (productName) {
        data = items || [];
      }

    } else if (
      questionLower.includes('gasto') &&
      (questionLower.includes('fornecedor') || questionLower.includes('fornecedores'))
    ) {
      const { data: purchases } = await supabase
        .from('purchases')
        .select('id, supplier_name_raw, date')
        .eq('user_id', userId);

      const purchaseIds = purchases?.map((p) => p.id) || [];

      const { data: items } = await supabase
        .from('purchase_items')
        .select('purchase_id, total_cost')
        .eq('user_id', userId)
        .in('purchase_id', purchaseIds);

      const supplierTotals: { [key: string]: number } = {};

      purchases?.forEach((purchase) => {
        const purchaseItems = items?.filter((item) => item.purchase_id === purchase.id) || [];
        const total = purchaseItems.reduce((sum, item) => sum + Number(item.total_cost), 0);

        if (!supplierTotals[purchase.supplier_name_raw]) {
          supplierTotals[purchase.supplier_name_raw] = 0;
        }
        supplierTotals[purchase.supplier_name_raw] += total;
      });

      const tableData = Object.entries(supplierTotals)
        .map(([supplier, total]) => ({ fornecedor: supplier, total: total }))
        .sort((a, b) => b.total - a.total);

      answer = `Aqui está o total gasto por fornecedor:`;
      data = tableData;

    } else if (
      (questionLower.includes('preço médio') || questionLower.includes('preco medio')) &&
      questionLower.includes('semana')
    ) {
      const productMatch = question.match(/(?:de |do |da )([\w\s]+?)(?:\s+(?:nas|últimas|semanas)|$)/i);
      const productName = productMatch ? productMatch[1].trim() : 'tomate';

      const weeksMatch = question.match(/(\d+)\s+semanas/);
      const numWeeks = weeksMatch ? parseInt(weeksMatch[1]) : 8;

      const hoje = new Date();
      const startDate = new Date(hoje);
      startDate.setDate(hoje.getDate() - (numWeeks * 7));

      const { data: items } = await supabase
        .from('purchase_items')
        .select('total_cost, weight_kg, created_at')
        .eq('user_id', userId)
        .ilike('product_name_normalized', `%${productName}%`)
        .gte('created_at', startDate.toISOString());

      const weeklyData: { [key: string]: { total: number; kg: number } } = {};

      items?.forEach((item) => {
        const date = new Date(item.created_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { total: 0, kg: 0 };
        }
        weeklyData[weekKey].total += Number(item.total_cost);
        weeklyData[weekKey].kg += Number(item.weight_kg) || 0;
      });

      const tableData = Object.entries(weeklyData)
        .map(([week, data]) => ({
          semana: new Date(week).toLocaleDateString('pt-BR'),
          preco_medio_kg: data.kg > 0 ? (data.total / data.kg).toFixed(2) : '0.00',
          kg_total: data.kg.toFixed(2),
        }))
        .sort((a, b) => a.semana.localeCompare(b.semana));

      answer = `Preço médio de ${productName} nas últimas ${numWeeks} semanas:`;
      data = tableData;

    } else if (
      (questionLower.includes('quantidade') || questionLower.includes('kg') || questionLower.includes('comprei')) &&
      (questionLower.includes('mês') || questionLower.includes('este mês') || questionLower.includes('neste mês') || questionLower.includes('mensal'))
    ) {
      const productMatch = question.match(/(?:de |do |da )([\w\s]+?)(?:\s+(?:no|neste|este|mês|mensal)|$)/i);
      const productName = productMatch ? productMatch[1].trim() : null;

      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

      let query = supabase
        .from('purchase_items')
        .select('weight_kg, quantity, unit, product_name_normalized, name_ocr, total_cost, created_at')
        .eq('user_id', userId)
        .gte('created_at', inicioMes.toISOString());

      if (productName) {
        query = query.or(`product_name_normalized.ilike.%${productName}%,name_ocr.ilike.%${productName}%`);
      }

      const { data: items } = await query;

      const totalKg = items?.reduce((sum, item) => sum + (Number(item.weight_kg) || 0), 0) || 0;
      const totalUn = items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;

      if (productName) {
        answer = `Este mês você comprou ${totalKg > 0 ? `${totalKg.toFixed(2)} kg` : ''}${totalKg > 0 && totalUn > 0 ? ' e ' : ''}${totalUn > 0 ? `${totalUn} unidades` : ''} de ${productName}.`;
        data = items || [];
      } else {
        const productSummary: { [key: string]: { kg: number; un: number; total: number } } = {};
        items?.forEach(item => {
          const name = item.product_name_normalized || item.name_ocr;
          if (!productSummary[name]) {
            productSummary[name] = { kg: 0, un: 0, total: 0 };
          }
          productSummary[name].kg += Number(item.weight_kg) || 0;
          productSummary[name].un += Number(item.quantity) || 0;
          productSummary[name].total += Number(item.total_cost) || 0;
        });

        const tableData = Object.entries(productSummary).map(([name, data]) => ({
          produto: name,
          quantidade: data.kg > 0 ? `${data.kg.toFixed(2)} kg` : `${data.un} un`,
          total: `R$ ${data.total.toFixed(2)}`
        }));

        answer = `Este mês você comprou ${Object.keys(productSummary).length} produtos diferentes:`;
        data = tableData;
      }

    } else if (
      questionLower.includes('gasto total') ||
      (questionLower.includes('quanto gastei') && questionLower.includes('mês'))
    ) {
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

      const { data: items } = await supabase
        .from('purchase_items')
        .select('total_cost, created_at')
        .eq('user_id', userId)
        .gte('created_at', inicioMes.toISOString());

      const total = items?.reduce((sum, item) => sum + Number(item.total_cost), 0) || 0;

      answer = `Você gastou R$ ${total.toFixed(2)} este mês.`;
      data = [{ periodo: 'Este mês', total: total.toFixed(2) }];

    } else if (questionLower.includes('boleto')) {
      const hoje = new Date();
      const proximos30Dias = new Date(hoje);
      proximos30Dias.setDate(hoje.getDate() + 30);

      const { data: bills } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'scheduled')
        .gte('due_date', hoje.toISOString().split('T')[0])
        .lte('due_date', proximos30Dias.toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      const tableData = bills?.map((bill) => ({
        vencimento: new Date(bill.due_date).toLocaleDateString('pt-BR'),
        emissor: bill.issuer_name,
        valor: Number(bill.amount).toFixed(2),
        status: bill.status,
      })) || [];

      answer = `Você tem ${bills?.length || 0} boletos a pagar nos próximos 30 dias:`;
      data = tableData;

    } else if (questionLower.includes('resumo') || questionLower.includes('dashboard')) {
      const hoje = new Date();
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());

      const { data: items } = await supabase
        .from('purchase_items')
        .select('total_cost, weight_kg, product_name_normalized')
        .eq('user_id', userId)
        .gte('created_at', inicioSemana.toISOString());

      const gastoSemana = items?.reduce((sum, item) => sum + Number(item.total_cost), 0) || 0;
      const kgTomate = items
        ?.filter((item) => item.product_name_normalized?.toLowerCase().includes('tomate'))
        .reduce((sum, item) => sum + (Number(item.weight_kg) || 0), 0) || 0;

      const proximos7Dias = new Date(hoje);
      proximos7Dias.setDate(hoje.getDate() + 7);

      const { data: bills } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'scheduled')
        .gte('due_date', hoje.toISOString().split('T')[0])
        .lte('due_date', proximos7Dias.toISOString().split('T')[0]);

      answer = `Resumo da semana:\n- Gasto total: R$ ${gastoSemana.toFixed(2)}\n- Tomate comprado: ${kgTomate.toFixed(2)} kg\n- Boletos próximos 7 dias: ${bills?.length || 0}`;
      data = [
        { metrica: 'Gasto Semana', valor: `R$ ${gastoSemana.toFixed(2)}` },
        { metrica: 'Kg Tomate', valor: `${kgTomate.toFixed(2)} kg` },
        { metrica: 'Boletos (7 dias)', valor: bills?.length || 0 },
      ];

    } else {
      answer = 'Desculpe, não entendi sua pergunta. Experimente perguntar sobre:\n- Quantidade de kg de um produto na semana\n- Gasto por fornecedor\n- Preço médio de um produto\n- Gasto total do mês\n- Boletos a pagar\n- Resumo da semana';
      data = [];
    }

    return new Response(
      JSON.stringify({ answer, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});