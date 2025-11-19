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

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY') || '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';
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY não configurada.');
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

    console.log('Chamando API do Claude...');

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorData = await anthropicResponse.text();
      console.error('Erro da API Claude:', errorData);
      throw new Error(`Erro ao chamar API do Claude: ${anthropicResponse.status}`);
    }

    const anthropicData = await anthropicResponse.json();
    const extractedText = anthropicData.content[0].text;

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