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
    const { fileUrl, userId } = await req.json();

    if (!fileUrl || !userId) {
      throw new Error('fileUrl e userId são obrigatórios');
    }

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY') || 'ANTHROPIC_API_KEY_FROM_ENV';
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY não configurada.');
    }

    console.log('Iniciando processamento de cupom...');
    console.log('File URL:', fileUrl);

    const imageResponse = await fetch(fileUrl);
    if (!imageResponse.ok) {
      throw new Error('Erro ao baixar imagem');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    console.log('Tamanho da imagem:', imageBuffer.byteLength, 'bytes');
    
    const base64Image = arrayBufferToBase64(imageBuffer);
    console.log('Imagem convertida para base64');

    const prompt = `Você é um assistente especializado em extrair dados de cupons fiscais brasileiros.

Analise esta imagem de cupom fiscal e extraia as seguintes informações em formato JSON:

{
  "date": "YYYY-MM-DD",
  "supplier_name": "nome completo do fornecedor/loja",
  "invoice_number": "número da nota fiscal ou null",
  "payment_method": "método de pagamento (ex: MASTERCARD, DINHEIRO, PIX) ou null",
  "total_amount": valor total da compra (número),
  "items": [
    {
      "name": "nome completo do produto como aparece no cupom",
      "unit": "kg" ou "un" ou "L",
      "quantity": número de unidades ou null,
      "weight_kg": peso em kg ou null,
      "unit_price": preço unitário após desconto,
      "discount": valor do desconto unitário ou null,
      "total_cost": custo total do item (preço final x quantidade)
    }
  ],
  "observations": "observações relevantes ou null"
}

REGRAS IMPORTANTES:
- A data deve estar no formato YYYY-MM-DD (ex: 2025-10-30)
- total_amount é o valor FINAL da compra (procure por "VALOR TOTAL" no cupom)
- Para itens vendidos por peso (kg), coloque weight_kg com o valor e quantity como null
- Para itens vendidos por unidade, coloque quantity com o número e weight_kg como null
- unit_price deve ser o preço APÓS o desconto (se houver)
- discount deve ser o valor do desconto POR UNIDADE (não o desconto total)
- total_cost é o valor FINAL do item (já com desconto aplicado)
- Todos os valores monetários devem ser números decimais (não strings)
- Preserve o nome completo do produto exatamente como aparece no cupom
- Se não conseguir identificar algum campo, use null
- Retorne APENAS o JSON, sem texto adicional ou explicações`;

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
        max_tokens: 4096,
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

    let cupomData;
    try {
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      cupomData = JSON.parse(jsonMatch ? jsonMatch[0] : extractedText);
    } catch (e) {
      console.error('Erro ao parsear JSON:', e);
      throw new Error('Erro ao parsear resposta da IA');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Normalizando nomes dos produtos com IA...');

    const productNames = cupomData.items.map((item: any) => item.name).join('\n- ');

    const normalizationPrompt = `Você é um especialista em corrigir erros de OCR e normalizar nomes de produtos de supermercado.

PRODUTOS LIDOS DO CUPOM:
- ${productNames}

Sua tarefa:
1. Identifique e corrija erros de OCR (letras trocadas, faltando, etc)
2. Normalize para um nome padrão, genérico e curto
3. Agrupe variações do mesmo produto

EXEMPLOS DE CORREÇÕES:
- "TONHTE ITALIANO KG" → "Tomate"
- "CANJICA BRANCA 500G" → "Canjica"
- "BATATH INGLESA" → "Batata"
- "CEBOULA ROXA" → "Cebola"
- "ARROZ TIPO 1" → "Arroz Tipo 1"
- "FEIJAO PRETO" → "Feijão Preto"

REGRAS:
- Corrija TODOS os erros de OCR
- Use nomes GENÉRICOS (sem marcas, sem "KG", sem "UN", sem pesos)
- Capitalize corretamente (primeira letra maiúscula)
- Para produtos processados complexos, mantenha especificações (ex: "Arroz Tipo 1")
- Para produtos frescos/hortifrúti, use apenas o nome básico

FORMATO DE SAÍDA (JSON):
{
  "TONHTE ITALIANO KG": "Tomate",
  "CANJICA BRANCA 500G": "Canjica"
}

Retorne APENAS o JSON com o mapeamento completo de TODOS os produtos listados acima.`;

    console.log('Chamando IA para normalização...');

    const normalizationResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: normalizationPrompt,
          },
        ],
      }),
    });

    let productNameMapping: Record<string, string> = {};

    if (normalizationResponse.ok) {
      const normalizationData = await normalizationResponse.json();
      const normalizationText = normalizationData.content[0].text;

      try {
        const jsonMatch = normalizationText.match(/\{[\s\S]*\}/);
        productNameMapping = JSON.parse(jsonMatch ? jsonMatch[0] : normalizationText);
        console.log('Mapeamento de produtos:', JSON.stringify(productNameMapping));
      } catch (e) {
        console.error('Erro ao parsear normalização:', e);
        console.error('Resposta da IA:', normalizationText);
      }
    } else {
      console.error('Erro na normalização, usando nomes originais');
    }

    console.log('Salvando compra no banco...');

    const { data: purchase, error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        user_id: userId,
        date: cupomData.date,
        supplier_name_raw: cupomData.supplier_name,
        invoice_number: cupomData.invoice_number,
        payment_method: cupomData.payment_method,
        total_amount: cupomData.total_amount || null,
        receipt_url: fileUrl,
        raw_ocr_text: extractedText,
        status: 'ok',
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Erro ao salvar compra:', purchaseError);
      throw purchaseError;
    }

    console.log('Compra salva, ID:', purchase.id);
    console.log('Processando', cupomData.items.length, 'itens...');

    for (const item of cupomData.items) {
      const productNameNormalized = productNameMapping[item.name] || null;

      let productId = null;
      if (productNameNormalized) {
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('user_id', userId)
          .eq('name', productNameNormalized)
          .maybeSingle();

        if (existingProduct) {
          productId = existingProduct.id;
        } else {
          const { data: newProduct } = await supabase
            .from('products')
            .insert({
              user_id: userId,
              name: productNameNormalized,
              unit_preferred: item.unit,
            })
            .select()
            .single();

          if (newProduct) productId = newProduct.id;
        }
      }

      await supabase.from('purchase_items').insert({
        user_id: userId,
        purchase_id: purchase.id,
        product_id: productId,
        product_name_normalized: productNameNormalized,
        name_ocr: item.name,
        unit: item.unit,
        weight_kg: item.weight_kg,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount || 0,
        total_cost: item.total_cost,
      });
    }

    console.log('Salvando recibo...');

    await supabase.from('receipts').insert({
      user_id: userId,
      purchase_id: purchase.id,
      source: 'upload',
      file_type: 'image/jpeg',
      url: fileUrl,
      status: 'parsed',
    });

    console.log('Processamento concluído com sucesso!');

    return new Response(
      JSON.stringify({
        success: true,
        purchaseId: purchase.id,
        itemsCount: cupomData.items.length,
      }),
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
