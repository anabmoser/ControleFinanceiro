import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function findProductByMapping(supabase: any, nomeOcr: string) {
  const normalizedName = nomeOcr.toLowerCase().trim();
  
  const { data: mapping } = await supabase
    .from('product_mappings')
    .select('product_id, confidence')
    .eq('nome_ocr', normalizedName)
    .order('confidence', { ascending: false })
    .order('times_used', { ascending: false })
    .maybeSingle();
  
  if (mapping && mapping.confidence >= 0.6) {
    await supabase.rpc('increment_mapping_usage', { mapping_nome: normalizedName });
    return mapping.product_id;
  }
  
  return null;
}

async function findProductByAI(supabase: any, nomeOcr: string) {
  const { data: produtos } = await supabase
    .from('products')
    .select('id, nome, aliases');
  
  if (!produtos || produtos.length === 0) return null;
  
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) return null;
  
  try {
    const prompt = `Dado o nome de produto "${nomeOcr}" extraído de um cupom fiscal, qual destes produtos corresponde?

Produtos disponíveis:
${produtos.map(p => `- ${p.nome} (ID: ${p.id})${p.aliases ? ` [aliases: ${p.aliases.join(', ')}]` : ''}`).join('\n')}

Retorne APENAS o ID do produto correspondente ou "null" se nenhum corresponder.
Resposta:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.3,
      }),
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    const productId = data.choices[0].message.content.trim();
    
    if (productId && productId !== 'null' && produtos.find(p => p.id === productId)) {
      await supabase.from('product_mappings').upsert({
        nome_ocr: nomeOcr.toLowerCase().trim(),
        product_id: productId,
        confidence: 0.7,
        confirmed_by_user: false,
        times_used: 1,
      }, { onConflict: 'nome_ocr' });
      
      return productId;
    }
  } catch (error) {
    console.error('Erro ao buscar com IA:', error);
  }
  
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { fileUrl } = await req.json();

    if (!fileUrl) {
      throw new Error('fileUrl é obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    console.log('Baixando imagem...');
    const imageResponse = await fetch(fileUrl);
    if (!imageResponse.ok) {
      throw new Error('Erro ao baixar imagem');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = arrayBufferToBase64(imageBuffer);

    const prompt = `Você é um assistente especializado em extrair dados de cupons fiscais brasileiros.

Analise esta imagem de cupom fiscal e extraia as seguintes informações em formato JSON:

{
  "fornecedor": "nome do fornecedor/loja",
  "numero_nota": "número da nota ou null",
  "data": "YYYY-MM-DD",
  "valor_total": número decimal,
  "itens": [
    {
      "nome": "nome do produto EXATAMENTE como está no cupom",
      "quantidade": número decimal,
      "unidade": "kg ou un ou L",
      "preco_unitario": número decimal,
      "preco_total": número decimal
    }
  ]
}

REGRAS:
- Todos os valores monetários devem ser números (não strings)
- Data no formato YYYY-MM-DD
- Nome do produto EXATAMENTE como aparece no cupom (ex: QJ PARM não deve virar Queijo Parmesão)
- Se não conseguir identificar algo, use null
- Retorne APENAS o JSON, sem texto adicional`;

    console.log('Chamando API do OpenAI para OCR...');

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
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2048,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('Erro da API OpenAI:', errorData);
      throw new Error(`Erro ao chamar API do OpenAI: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const extractedText = openaiData.choices[0].message.content;

    let cupomData;
    try {
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      cupomData = JSON.parse(jsonMatch ? jsonMatch[0] : extractedText);
    } catch (e) {
      console.error('Erro ao parsear JSON:', e);
      console.error('Texto recebido:', extractedText);
      throw new Error('Erro ao processar resposta da IA');
    }

    console.log('Vinculando produtos...');
    
    for (const item of cupomData.itens) {
      let productId = await findProductByMapping(supabase, item.nome);
      
      if (!productId) {
        productId = await findProductByAI(supabase, item.nome);
      }
      
      item.product_id = productId;
      item.needs_confirmation = !productId;
    }

    const itensNaoVinculados = cupomData.itens.filter((i: any) => i.needs_confirmation).length;
    
    return new Response(
      JSON.stringify({
        ...cupomData,
        itens_nao_vinculados: itensNaoVinculados,
        precisa_confirmacao: itensNaoVinculados > 0,
      }),
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