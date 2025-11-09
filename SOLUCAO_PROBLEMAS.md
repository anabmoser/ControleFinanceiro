# 🔧 Soluções para Problemas Comuns

## 🚨 Problema: "Não consigo fazer funcionar na Vercel"

### Diagnóstico: O que pode estar errado?

Existem 4 causas principais:

#### 1️⃣ Variáveis de ambiente não configuradas na Vercel

**Sintomas:**
- Página branca ao abrir o site
- Erro no console: "Variáveis de ambiente do Supabase não configuradas"
- Build passa, mas app não funciona

**Solução:**
1. Acesse: https://vercel.com/dashboard
2. Clique no seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Adicione as variáveis:

```
VITE_SUPABASE_URL = https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY = eyJ... (sua chave anon)
```

5. Vá em **Deployments**
6. Clique nos **...** do último deploy
7. Clique em **Redeploy**

---

#### 2️⃣ Rotas SPA não configuradas (404 ao navegar)

**Sintomas:**
- Página inicial carrega
- Ao clicar em links ou recarregar a página → 404 Not Found
- URLs como `/dashboard` ou `/upload` retornam 404

**Solução:**
✅ **Já resolvido!** O arquivo `vercel.json` já está configurado corretamente.

Se ainda assim tiver problemas:
1. Verifique se o arquivo `vercel.json` está no repositório
2. Faça commit e push:
   ```bash
   git add vercel.json
   git commit -m "Adicionar configuração de rotas"
   git push
   ```
3. Aguarde o novo deploy automático

---

#### 3️⃣ Credenciais do Supabase incorretas

**Sintomas:**
- Erro ao fazer login
- Erro: "Invalid API key"
- Console mostra erros de autenticação

**Solução:**
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Project Settings** → **API**
4. Copie novamente:
   - **Project URL**
   - **anon public** key
5. Verifique se as variáveis na Vercel estão EXATAMENTE iguais
6. Refaça o deploy

---

#### 4️⃣ Build falhando na Vercel

**Sintomas:**
- Deploy falha com erro
- Mensagem: "Build failed"
- Vercel mostra logs de erro

**Soluções:**

**Erro de TypeScript:**
```bash
# Execute localmente para ver erros:
npm run typecheck
```
Corrija os erros de tipagem antes de fazer push.

**Erro de dependências:**
```bash
# Limpe cache e reinstale:
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "Atualizar dependências"
git push
```

**Erro de build do Vite:**
```bash
# Teste o build localmente:
npm run build
```
Se funcionar localmente, o problema pode estar nas variáveis de ambiente da Vercel.

---

## 🚨 Problema: "Upload de imagens não funciona"

### Diagnóstico

**Sintomas:**
- Upload da imagem funciona
- Mensagem: "Processando documento..."
- Depois: Erro ou timeout
- Console: "Failed to process document"

**Causa:** A chave `ANTHROPIC_API_KEY` não está configurada nas Edge Functions do Supabase.

### Solução

1. **Configurar a chave no Supabase:**
   - Acesse: https://supabase.com/dashboard
   - Selecione seu projeto
   - Vá em **Project Settings** → **Edge Functions**
   - Role até **Environment Variables**
   - Clique em **Add Variable**
   - Nome: `ANTHROPIC_API_KEY`
   - Valor: `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`
   - Clique em **Save**

2. **Aguarde 1-2 minutos** para a variável ser propagada

3. **Teste novamente:**
   - Faça upload de um cupom fiscal
   - Deve processar e extrair os dados

4. **Verificar logs (se ainda não funcionar):**
   - Acesse: https://supabase.com/dashboard
   - Vá em **Edge Functions** → **Logs**
   - Procure por erros da função `processar-cupom`

---

## 🚨 Problema: "Login não funciona"

### Sintomas
- Não consegue fazer login
- Não consegue cadastrar
- Erro: "Invalid login credentials"

### Soluções

#### Solução 1: Email de confirmação
1. Acesse: https://supabase.com/dashboard
2. Vá em **Authentication** → **Providers**
3. Clique em **Email**
4. Desabilite "Confirm email" (para testes)
5. Tente cadastrar novamente

#### Solução 2: URLs permitidas
1. Acesse: https://supabase.com/dashboard
2. Vá em **Authentication** → **URL Configuration**
3. Adicione suas URLs:
   - `http://localhost:5173` (desenvolvimento)
   - `https://seu-app.vercel.app` (produção)
   - `https://*.vercel.app` (preview deployments)

#### Solução 3: Verificar RLS (Row Level Security)
1. Acesse: https://supabase.com/dashboard
2. Vá em **Table Editor**
3. Para cada tabela, verifique se RLS está habilitado
4. Clique na tabela → Ícone de cadeado → "Enable RLS"

---

## 🚨 Problema: "Página branca / nada aparece"

### Diagnóstico

**Abra o console do navegador (F12):**

#### Erro: "Variáveis de ambiente..."
→ Veja solução do Problema 1 acima

#### Erro: "Failed to fetch"
→ Problema de CORS ou URL incorreta do Supabase

**Solução:**
1. Verifique se `VITE_SUPABASE_URL` está correta
2. Acesse a URL diretamente no navegador
3. Deve abrir a página do Supabase
4. Se não abrir, a URL está errada

#### Erro: "Cannot read property..."
→ Problema no código JavaScript

**Solução:**
1. Verifique se fez build recente: `npm run build`
2. Limpe cache do navegador (Ctrl+Shift+Delete)
3. Tente em janela anônima
4. Refaça o deploy na Vercel

---

## 🚨 Problema: "Funciona localmente, mas não na Vercel"

### Causa: Variáveis de ambiente

**Localmente:** Você tem o arquivo `.env` com as variáveis
**Na Vercel:** Precisa configurar manualmente

### Solução

1. **Liste suas variáveis locais:**
   ```bash
   cat .env
   ```

2. **Adicione TODAS na Vercel:**
   - Vá em: https://vercel.com/dashboard
   - Settings → Environment Variables
   - Adicione uma por uma

3. **Variáveis obrigatórias:**
   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   ```

4. **Refaça o deploy:**
   - Deployments → ... → Redeploy
   - Marque "Use existing build cache" = OFF

---

## 🚨 Problema: "CORS Error"

### Sintomas
- Erro no console: "CORS policy: No 'Access-Control-Allow-Origin'"
- Requisições para Supabase são bloqueadas

### Soluções

#### Solução 1: Verificar URL do Supabase
A URL deve ser EXATAMENTE:
```
https://SEU-PROJETO.supabase.co
```

❌ Errado: `http://...` (sem s)
❌ Errado: `.../api` (com /api no final)
❌ Errado: `...supabase.com` (.com em vez de .co)

#### Solução 2: Verificar tipo de chave
Use a chave **anon public**, NÃO a **service_role**

#### Solução 3: Limpar cache
```bash
# Limpe completamente:
rm -rf node_modules dist
npm install
npm run build
```

---

## 🛠️ Ferramentas de Diagnóstico

### Script de verificação
```bash
npm run check
```
Este comando verifica:
- ✅ Arquivo .env existe
- ✅ Variáveis configuradas
- ✅ node_modules instalados
- ✅ Build gerado

### Verificar localmente
```bash
# 1. Instalar
npm install

# 2. Verificar configuração
npm run check

# 3. Testar localmente
npm run dev

# 4. Criar build
npm run build

# 5. Testar build
npm run preview
```

### Logs úteis

**Console do navegador (F12):**
- Mostra erros de JavaScript
- Mostra requisições de rede
- Mostra mensagens de debug

**Vercel Logs:**
- https://vercel.com/dashboard
- Seu projeto → Deployments → Último deploy → Logs

**Supabase Logs:**
- https://supabase.com/dashboard
- Seu projeto → Edge Functions → Logs

---

## 📞 Checklist Completo

Antes de pedir ajuda, verifique:

- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] URL do Supabase correta (https://...supabase.co)
- [ ] Chave anon pública (não service_role)
- [ ] ANTHROPIC_API_KEY configurada no Supabase
- [ ] arquivo vercel.json presente
- [ ] Build local funciona: `npm run build`
- [ ] Verificado logs do console (F12)
- [ ] Verificado logs da Vercel
- [ ] Verificado logs do Supabase

---

## 🎯 Solução Rápida (Refazer tudo)

Se nada funcionar, refaça do zero:

```bash
# 1. Limpar tudo
rm -rf node_modules dist .vercel

# 2. Reinstalar
npm install

# 3. Verificar configuração
npm run check

# 4. Criar arquivo .env (se não existir)
cp .env.example .env
nano .env  # Edite com suas credenciais

# 5. Testar localmente
npm run dev

# 6. Se funcionar, fazer build
npm run build

# 7. Fazer commit e push
git add .
git commit -m "Refazer configuração"
git push

# 8. Na Vercel, refazer deploy:
# - Vá em Deployments
# - ... → Redeploy
# - Use existing cache = OFF
```

---

**Ainda com problemas? Veja também:**
- [📖 INSTRUCOES.md](./INSTRUCOES.md) - Instruções gerais
- [🚀 GUIA_DEPLOY_VERCEL.md](./GUIA_DEPLOY_VERCEL.md) - Deploy passo a passo
- [🔧 CONFIGURACAO_API.md](./CONFIGURACAO_API.md) - Configuração da API

**Consulte os logs:**
- Console do navegador (F12)
- Logs da Vercel
- Logs do Supabase Edge Functions
