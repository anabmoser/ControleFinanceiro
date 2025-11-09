#!/usr/bin/env node

/**
 * Script de validação de configuração
 * Verifica se todas as variáveis necessárias estão configuradas
 */

console.log('🔍 Verificando configuração do projeto...\n');

// Verificar arquivo .env
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

let hasErrors = false;

// 1. Verificar se .env existe
if (!fs.existsSync(envPath)) {
  console.log('❌ Arquivo .env NÃO encontrado');
  console.log('   💡 Execute: cp .env.example .env');
  hasErrors = true;
} else {
  console.log('✅ Arquivo .env encontrado');
  
  // 2. Ler e verificar variáveis
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  console.log('\n📋 Variáveis de ambiente:');
  
  requiredVars.forEach(varName => {
    const regex = new RegExp(`${varName}=(.+)`, 'i');
    const match = envContent.match(regex);
    
    if (!match) {
      console.log(`   ❌ ${varName} - NÃO configurada`);
      hasErrors = true;
    } else {
      const value = match[1].trim();
      if (value.includes('seu-projeto') || value.includes('sua-chave') || value.length < 10) {
        console.log(`   ⚠️  ${varName} - Valor parece ser placeholder`);
        hasErrors = true;
      } else {
        console.log(`   ✅ ${varName} - Configurada`);
      }
    }
  });
}

// 3. Verificar vercel.json
const vercelJsonPath = path.join(__dirname, 'vercel.json');
if (!fs.existsSync(vercelJsonPath)) {
  console.log('\n❌ Arquivo vercel.json NÃO encontrado');
  console.log('   💡 Este arquivo é necessário para o deploy na Vercel');
  hasErrors = true;
} else {
  console.log('\n✅ Arquivo vercel.json encontrado');
}

// 4. Verificar node_modules
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('\n❌ node_modules NÃO encontrado');
  console.log('   💡 Execute: npm install');
  hasErrors = true;
} else {
  console.log('\n✅ node_modules encontrado');
}

// 5. Verificar build
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.log('\n⚠️  Build (dist/) não encontrado');
  console.log('   💡 Execute: npm run build');
} else {
  console.log('\n✅ Build (dist/) encontrado');
}

// Resumo
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ CONFIGURAÇÃO INCOMPLETA');
  console.log('\nCorreja os problemas acima antes de fazer deploy.');
  console.log('\n📚 Consulte: GUIA_DEPLOY_VERCEL.md');
  process.exit(1);
} else {
  console.log('✅ TUDO CERTO!');
  console.log('\nSeu projeto está pronto para desenvolvimento ou deploy.');
  console.log('\n📚 Próximos passos:');
  console.log('   - Desenvolvimento local: npm run dev');
  console.log('   - Build: npm run build');
  console.log('   - Deploy: vercel --prod');
  process.exit(0);
}
