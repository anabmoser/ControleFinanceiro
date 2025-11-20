import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { busca } = await req.json();

    if (!busca) {
      throw new Error('Parâmetro "busca" é obrigatório');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    const { data: produtos, error: produtosError } = await supabase
      .from('products')
      .select('id, nome, categoria, aliases');

    if (produtosError) throw produtosError;

    const prompt = `Você é um assistente especializado em encontrar produtos em um banco de dados de restaurante.

Entrada do usuário: "${busca}"

Lista de produtos disponíveis:
${produtos.map(p => `- ID: ${p.id}, Nome: ${p.nome}, Categoria: ${p.categoria || 'Sem categoria'}, Aliases: ${p.aliases ? p.aliases.join(', ') : 'nenhum'}`).join('\n')}

TAREFA:
1. Identifique qual(is) produto(s) da lista corresponde(m) à busca do usuário
2. Considere abreviações, erros de OCR, nomes incompletos e sinônimos
3. Retorne APENAS um array JSON com os IDs dos produtos que correspondem

Exemplos:
- "qj parm" → "Queijo Parmesão"
- "batata ing" → "Batata Inglesa"
- "tom" → "Tomate"
- "oleo" → "Óleo"

Retorne APENAS um JSON no formato:
{"produto_ids": ["id1", "id2", ...]}

Se não encontrar correspondência, retorne:
{"produto_ids": []}`;

    console.log('Chamando OpenAI para busca inteligente...');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('Erro da API OpenAI:', errorData);
      throw new Error(`Erro ao chamar API do OpenAI: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const resultText = openaiData.choices[0].message.content;

    console.log('Resposta da IA:', resultText);

    let resultado;
    try {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      resultado = JSON.parse(jsonMatch ? jsonMatch[0] : resultText);
    } catch (e) {
      console.error('Erro ao parsear JSON:', e);
      resultado = { produto_ids: [] };
    }

    return new Response(
      JSON.stringify(resultado),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message, produto_ids: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});