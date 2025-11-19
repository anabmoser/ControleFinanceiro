import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { fileUrl } = await req.json();

    if (!fileUrl) {
      throw new Error('fileUrl é obrigatório');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurada.');
    }

    console.log('Iniciando processamento de boleto...');
    console.log('File URL:', fileUrl);

    const imageResponse = await fetch(fileUrl);
    if (!imageResponse.ok) {
      throw new Error('Erro ao baixar imagem');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    console.log('Tamanho da imagem:', imageBuffer.byteLength, 'bytes');

    const base64Image = arrayBufferToBase64(imageBuffer);
    console.log('Imagem convertida para base64');

    const prompt = `Você é um assistente especializado em extrair dados de boletos bancários brasileiros.

Analise esta imagem de boleto e extraia as seguintes informações em formato JSON:

{
  "issuer_name": "nome do beneficiário/emissor",
  "cnpj": "CNPJ do beneficiário ou null",
  "description": "descrição do boleto ou null",
  "due_date": "YYYY-MM-DD",
  "amount": valor do boleto (número),
  "barcode": "código de barras do boleto",
  "our_number": "nosso número ou null"
}

REGRAS IMPORTANTES:
- O valor deve ser um número (não string)
- A data deve estar no formato YYYY-MM-DD
- O código de barras é obrigatório
- Se não conseguir identificar algum campo opcional, use null
- Retorne APENAS o JSON, sem texto adicional`;

    console.log('Chamando API do OpenAI...');

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

    console.log('Resposta da IA:', extractedText);

    let boletoData;
    try {
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      boletoData = JSON.parse(jsonMatch ? jsonMatch[0] : extractedText);
    } catch (e) {
      console.error('Erro ao parsear JSON:', e);
      throw new Error('Erro ao parsear resposta da IA');
    }

    console.log('Processamento concluído com sucesso!');

    return new Response(
      JSON.stringify(boletoData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Erro no processamento:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});