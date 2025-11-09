# ⚡ Início Rápido - Deploy na Vercel

## 🎯 Passo 1: Configurar Supabase (5 minutos)

### 1.1 Obter credenciais
1. Acesse: https://supabase.com/dashboard
2. Clique no seu projeto
3. Vá em **⚙️ Settings** → **API**
4. Copie:
   - **Project URL**
   - **anon public** key

### 1.2 Configurar chave da IA
1. No mesmo painel do Supabase
2. Vá em **⚙️ Settings** → **Edge Functions**
3. Role até **Environment Variables**
4. Adicione:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `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`

---

## 🚀 Passo 2: Deploy na Vercel (3 minutos)

### 2.1 Importar projeto
1. Acesse: https://vercel.com/new
2. Selecione: **anabmoser/ControleFinanceiro**
3. Clique em **Import**

### 2.2 Configurar variáveis
Na tela de configuração, adicione:

| Nome | Valor |
|------|-------|
| `VITE_SUPABASE_URL` | Cole a URL do Supabase |
| `VITE_SUPABASE_ANON_KEY` | Cole a chave anon |

### 2.3 Deploy
1. Clique em **Deploy**
2. Aguarde 2-3 minutos
3. ✅ Pronto!

---

## 🎉 Passo 3: Testar (2 minutos)

1. Abra a URL fornecida pela Vercel
2. Clique em "Não tem conta? Cadastre-se"
3. Crie uma conta
4. Faça login
5. Teste fazer upload de um cupom fiscal

---

## ⚠️ Problemas?

### Página branca ou erro
→ Verifique se configurou as variáveis de ambiente na Vercel

### Upload não funciona
→ Verifique se configurou `ANTHROPIC_API_KEY` no Supabase

### Erro 404 ao navegar
→ Aguarde 1 minuto e limpe o cache (Ctrl+F5)

---

## 📚 Documentação Completa

- **Passo a passo detalhado:** [GUIA_DEPLOY_VERCEL.md](./GUIA_DEPLOY_VERCEL.md)
- **Solução de problemas:** [SOLUCAO_PROBLEMAS.md](./SOLUCAO_PROBLEMAS.md)
- **Instruções de uso:** [INSTRUCOES.md](./INSTRUCOES.md)

---

## 🔗 Links Úteis

- **Seu repositório:** https://github.com/anabmoser/ControleFinanceiro
- **Painel Vercel:** https://vercel.com/dashboard
- **Painel Supabase:** https://supabase.com/dashboard

---

**Total: ~10 minutos para o app estar funcionando! 🚀**
