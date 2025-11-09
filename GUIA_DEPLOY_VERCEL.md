# 🚀 Guia Completo de Deploy na Vercel

## 📋 Pré-requisitos

Antes de começar, você precisa ter:
- ✅ Conta no Supabase com projeto criado
- ✅ Conta na Vercel
- ✅ Código já no GitHub/GitLab (ou fazer upload manual)

---

## 🔧 Passo 1: Configurar Variáveis de Ambiente no Supabase

### 1.1 Obter credenciais do Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **⚙️ Project Settings**
4. Clique em **API**
5. Copie os seguintes valores:

   - **Project URL** (exemplo: `https://sytawlvusjkviolkcdit.supabase.co`)
   - **anon public** key (uma chave longa começando com `eyJ...`)

### 1.2 Configurar ANTHROPIC_API_KEY nas Edge Functions

1. Ainda no painel do Supabase
2. Vá em **Project Settings** → **Edge Functions**
3. Role até **Environment Variables**
4. Clique em **Add Variable**
5. Configure:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `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`
6. Clique em **Save**

---

## 🌐 Passo 2: Deploy na Vercel

### Opção A: Deploy via GitHub (Recomendado)

1. **Push o código para o GitHub:**
   ```bash
   git add .
   git commit -m "Configurar deploy para Vercel"
   git push origin main
   ```

2. **Conectar na Vercel:**
   - Acesse: https://vercel.com/new
   - Clique em **Import Project**
   - Selecione seu repositório
   - Clique em **Import**

3. **Configurar variáveis de ambiente na Vercel:**
   
   Na página de configuração do projeto, adicione as seguintes variáveis:
   
   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | `https://sytawlvusjkviolkcdit.supabase.co` (ou sua URL) |
   | `VITE_SUPABASE_ANON_KEY` | Sua chave anon do Supabase |

4. **Configurações de Build:**
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

5. Clique em **Deploy**

### Opção B: Deploy Manual via CLI

1. **Instalar Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login na Vercel:**
   ```bash
   vercel login
   ```

3. **Configurar variáveis de ambiente:**
   ```bash
   vercel env add VITE_SUPABASE_URL production
   vercel env add VITE_SUPABASE_ANON_KEY production
   ```

4. **Deploy:**
   ```bash
   vercel --prod
   ```

---

## ✅ Passo 3: Verificar Deploy

### 3.1 Testar o aplicativo

1. Abra a URL fornecida pela Vercel (exemplo: `https://seu-app.vercel.app`)
2. Tente fazer login ou cadastrar
3. Se aparecer erro, vá para o próximo passo

### 3.2 Verificar logs de erro

**No navegador:**
1. Pressione **F12** para abrir DevTools
2. Vá na aba **Console**
3. Procure por erros em vermelho

**Na Vercel:**
1. Acesse: https://vercel.com/dashboard
2. Clique no seu projeto
3. Vá em **Deployments** → Clique no último deploy
4. Vá em **Functions** ou **Logs**

---

## 🐛 Resolução de Problemas Comuns

### Problema 1: "Variáveis de ambiente do Supabase não configuradas"

**Causa:** As variáveis `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` não foram configuradas na Vercel.

**Solução:**
1. Vá em https://vercel.com/dashboard
2. Clique no seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Adicione as variáveis conforme o Passo 2

### Problema 2: "404 Not Found" ao navegar no app

**Causa:** Vercel não está redirecionando todas as rotas para o `index.html`.

**Solução:** 
O arquivo `vercel.json` já está configurado corretamente. Faça um novo deploy:
```bash
git add vercel.json
git commit -m "Adicionar configuração de rotas SPA"
git push
```

### Problema 3: Upload de imagens não funciona

**Causa:** A chave `ANTHROPIC_API_KEY` não está configurada nas Edge Functions.

**Solução:**
1. Siga o **Passo 1.2** deste guia
2. Aguarde 1-2 minutos para a variável ser aplicada
3. Teste novamente

### Problema 4: Login não funciona

**Causa:** Supabase Auth pode precisar configurar URLs permitidas.

**Solução:**
1. Acesse: https://supabase.com/dashboard
2. Vá em **Authentication** → **URL Configuration**
3. Adicione sua URL da Vercel em **Site URL** e **Redirect URLs**
   - Exemplo: `https://seu-app.vercel.app`
   - Exemplo com wildcard: `https://*.vercel.app`

### Problema 5: CORS Error

**Causa:** Supabase bloqueando requisições da sua URL.

**Solução:**
O Supabase geralmente aceita requisições de qualquer origem com a chave anon. Se ainda assim der erro:
1. Verifique se está usando a chave **anon** (pública)
2. Não use a chave **service_role** (secreta) no frontend

---

## 🔐 Segurança

### Variáveis que DEVEM estar na Vercel:
- ✅ `VITE_SUPABASE_URL` (pública - safe)
- ✅ `VITE_SUPABASE_ANON_KEY` (pública - safe)

### Variáveis que DEVEM estar no Supabase (Edge Functions):
- ✅ `ANTHROPIC_API_KEY` (secreta - NUNCA expor no frontend)

### ⚠️ NUNCA FAÇA:
- ❌ Não coloque `ANTHROPIC_API_KEY` na Vercel
- ❌ Não exponha chaves secretas no código fonte
- ❌ Não use `service_role` key no frontend

---

## 📊 Checklist Final

Antes de considerar o deploy completo, verifique:

- [ ] Projeto do Supabase criado e ativo
- [ ] Tabelas do banco de dados criadas (veja `INSTRUCOES.md`)
- [ ] Edge Functions deployadas no Supabase
- [ ] `ANTHROPIC_API_KEY` configurada nas Edge Functions
- [ ] `VITE_SUPABASE_URL` configurada na Vercel
- [ ] `VITE_SUPABASE_ANON_KEY` configurada na Vercel
- [ ] Build da Vercel concluído com sucesso
- [ ] Site acessível na URL da Vercel
- [ ] Login funcionando
- [ ] Dashboard carregando
- [ ] Upload de documentos funcionando

---

## 🆘 Ainda com problemas?

Se seguiu todos os passos e ainda não funciona:

1. **Verifique os logs:**
   - Console do navegador (F12)
   - Logs da Vercel
   - Logs das Edge Functions no Supabase

2. **Teste localmente:**
   ```bash
   npm install
   npm run dev
   ```
   Se funcionar localmente mas não na Vercel, o problema é nas variáveis de ambiente.

3. **Reconstrua o projeto:**
   - Na Vercel, vá em **Deployments**
   - Clique nos **...** do último deploy
   - Clique em **Redeploy**
   - Selecione **Use existing build cache** = OFF

---

## 📝 Comandos Úteis

```bash
# Testar localmente
npm run dev

# Criar build local
npm run build

# Visualizar build localmente
npm run preview

# Deploy manual na Vercel
vercel --prod

# Ver logs da Vercel
vercel logs [deployment-url]
```

---

**Deploy finalizado! 🎉**

Seu aplicativo deve estar funcionando em: `https://seu-app.vercel.app`
