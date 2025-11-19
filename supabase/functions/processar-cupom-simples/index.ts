import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { fileUrl } = await req.json();

    if (!fileUrl) {
      throw new Error('fileUrl é obrigatório');
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY não configurada');
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
      "nome": "nome do produto",
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
- Se não conseguir identificar algo, use null
- Retorne APENAS o JSON, sem texto adicional`;

    console.log('Chamando Gemini API...');
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error('Erro da API Gemini:', errorData);
      console.error('Status:', geminiResponse.status);

      if (geminiResponse.status === 404) {
        throw new Error('API Key inválida ou API não habilitada. Verifique sua chave em https://aistudio.google.com/apikey');
      }

      throw new Error(`Erro na IA: ${geminiResponse.status} - ${errorData}`);
    }

    const geminiData = await geminiResponse.json();

    if (!geminiData.candidates || !geminiData.candidates[0]?.content?.parts) {
      console.error('Resposta inválida:', geminiData);
      throw new Error('Resposta inválida da IA');
    }

    const extractedText = geminiData.candidates[0].content.parts[0].text;

    let cupomData;
    try {
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      cupomData = JSON.parse(jsonMatch ? jsonMatch[0] : extractedText);
    } catch (e) {
      console.error('Erro ao parsear JSON:', e);
      console.error('Texto recebido:', extractedText);
      throw new Error('Erro ao processar resposta da IA');
    }

    return new Response(
      JSON.stringify(cupomData),
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