#!/bin/bash

echo "🚀 Deploy Automático - Controle Restaurante"
echo "=========================================="
echo ""

# Verificar se está na pasta correta
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto!"
    exit 1
fi

# Verificar se o Vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "📦 Instalando Vercel CLI..."
    npm install -g vercel
fi

# Fazer login
echo ""
echo "🔐 Fazendo login no Vercel..."
vercel login

# Deploy
echo ""
echo "🚀 Iniciando deploy..."
vercel --prod

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "📝 Não esqueça de adicionar as variáveis de ambiente:"
echo ""
echo "vercel env add VITE_SUPABASE_URL"
echo "vercel env add VITE_SUPABASE_ANON_KEY"
echo ""
echo "Depois execute novamente: vercel --prod"
