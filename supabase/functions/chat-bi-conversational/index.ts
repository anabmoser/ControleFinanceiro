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
    const { question, userId, conversationHistory } = await req.json();

    if (!question || !userId) {
      throw new Error('question e userId são obrigatórios');
    }

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY não configurada');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Buscando dados do usuário...');

    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicioSemana = new Date(hoje);
    const dayOfWeek = inicioSemana.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    inicioSemana.setDate(inicioSemana.getDate() + diff);
    const tresMesesAtras = new Date(hoje);
    tresMesesAtras.setMonth(hoje.getMonth() - 3);

    const [purchasesResult, itemsResult, billsResult, productsResult] = await Promise.all([
      supabase
        .from('purchases')
        .select('id, date, supplier_name_raw, total_amount, payment_method')
        .eq('user_id', userId)
        .gte('date', tresMesesAtras.toISOString().split('T')[0])
        .order('date', { ascending: false }),

      supabase
        .from('purchase_items')
        .select('product_name_normalized, name_ocr, unit, quantity, weight_kg, unit_price, total_cost, created_at, purchase_id')
        .eq('user_id', userId)
        .gte('created_at', tresMesesAtras.toISOString()),

      supabase
        .from('bills')
        .select('due_date, issuer_name, amount, status')
        .eq('user_id', userId)
        .gte('due_date', tresMesesAtras.toISOString().split('T')[0])
        .order('due_date', { ascending: true }),

      supabase
        .from('products')
        .select('name, unit_preferred')
        .eq('user_id', userId)
    ]);

    const contextData = {
      total_compras: purchasesResult.data?.length || 0,
      compras: purchasesResult.data || [],
      itens_comprados: itemsResult.data || [],
      boletos: billsResult.data || [],
      produtos_cadastrados: productsResult.data || []
    };

    console.log('Chamando Claude para resposta conversacional...');

    const systemPrompt = `Você é um assistente de Business Intelligence amigável e inteligente, especializado em análise financeira pessoal.

CONTEXTO TEMPORAL (use como referência):
- Data de hoje: ${hoje.toISOString().split('T')[0]} (${hoje.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})
- Início da semana atual (segunda-feira): ${inicioSemana.toISOString().split('T')[0]}
- Início do mês atual: ${inicioMes.toISOString().split('T')[0]}
- Período de dados disponíveis: últimos 3 meses

DADOS DO USUÁRIO:
- Total de compras registradas: ${contextData.total_compras}
- Total de itens comprados: ${contextData.itens_comprados.length}
- Produtos cadastrados: ${contextData.produtos_cadastrados.length} (${contextData.produtos_cadastrados.map(p => p.name).slice(0, 10).join(', ')}${contextData.produtos_cadastrados.length > 10 ? '...' : ''})
- Boletos: ${contextData.boletos.length}

DADOS COMPLETOS:
${JSON.stringify(contextData, null, 2)}

INSTRUÇÕES PARA RESPONDER:

1. **ENTENDA O CONTEXTO EM PORTUGUÊS**: Interprete corretamente expressões coloquiais brasileiras:
   - "este mês" = mês atual (${inicioMes.toISOString().split('T')[0]} até hoje)
   - "esta semana" = semana atual iniciando na segunda-feira (${inicioSemana.toISOString().split('T')[0]} até hoje)
   - "mês passado" = mês anterior completo
   - "semana passada" = semana anterior completa
   - "últimos 7 dias", "últimos 30 dias", etc = período exato de dias
   - "hoje" = data atual (${hoje.toISOString().split('T')[0]})

2. **ANÁLISE DE DADOS**:
   - Filtre os dados pelo período correto conforme solicitado
   - Calcule totais, médias, máximos, mínimos quando relevante
   - Agrupe por fornecedor, produto, data conforme necessário
   - Compare períodos quando fizer sentido

3. **RESPONDA DE FORMA NATURAL**:
   - Use linguagem conversacional e amigável
   - Seja claro e objetivo
   - Apresente números formatados em português brasileiro (R$ 1.234,56)
   - Use datas no formato brasileiro (DD/MM/AAAA ou "dia/mês")

4. **SEJA PROATIVO**:
   - Se não houver dados, explique educadamente e sugira alternativas
   - Ofereça insights interessantes quando relevante
   - Sugira perguntas relacionadas que o usuário pode fazer
   - Compare com períodos anteriores quando apropriado

5. **EXEMPLOS DE PERGUNTAS QUE VOCÊ DEVE ENTENDER**:
   - "Quanto gastei este mês?" → calcular total de compras do mês atual
   - "Quais produtos comprei mais?" → agrupar itens por produto e ordenar por quantidade
   - "Quanto gastei no Carrefour?" → filtrar por fornecedor e somar
   - "Tenho boletos para pagar?" → listar boletos futuros ou hoje
   - "Qual foi minha compra mais cara?" → encontrar max(total_amount)
   - "Gastei mais esta semana ou na passada?" → comparar semanas
   - "Relatório de copra do plaspel" → entender que é "compra do plaspel" e buscar fornecedor

6. **TRATAMENTO DE ERROS DE DIGITAÇÃO**:
   - Seja tolerante com erros de digitação (ex: "plaspel" = "Plaspel")
   - Interprete "copra" como "compra"
   - Use correspondência aproximada para nomes de produtos e fornecedores

IMPORTANTE: Sempre forneça uma resposta útil e específica baseada nos dados disponíveis. Nunca diga apenas "não consegui processar" sem tentar entender a pergunta.`;

    const messages = [];

    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach((msg: any) => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
    }

    messages.push({
      role: 'user',
      content: question
    });

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: systemPrompt,
        messages: messages,
      }),
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('Erro da API Claude:', errorText);
      throw new Error(`Erro ao chamar API do Claude: ${anthropicResponse.status}`);
    }

    const anthropicData = await anthropicResponse.json();
    const answer = anthropicData.content[0].text;

    console.log('Resposta gerada:', answer);

    return new Response(
      JSON.stringify({ answer, data: [] }),
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
