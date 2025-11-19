# 🚀 Deploy no Vercel - Guia Completo

## Método 1: Deploy Direto via Vercel CLI (Mais Rápido - 2 minutos)

### Passo 1: Instale o Vercel CLI
```bash
npm install -g vercel
```

### Passo 2: Navegue até a pasta do projeto
```bash
cd /tmp/cc-agent/59631402/project
```

### Passo 3: Faça login no Vercel
```bash
vercel login
```
Siga as instruções no navegador para fazer login.

### Passo 4: Deploy!
```bash
vercel --prod
```

Quando perguntado:
- "Set up and deploy?" → **Y**
- "Which scope?" → Escolha sua conta
- "Link to existing project?" → **N**
- "What's your project's name?" → **controle-restaurante** (ou o nome que preferir)
- "In which directory is your code located?" → **./** (apenas Enter)
- "Want to override the settings?" → **N**

### Passo 5: Configure as variáveis de ambiente
Após o primeiro deploy, adicione as variáveis:

```bash
vercel env add VITE_SUPABASE_URL
# Cole: https://ixyxegpijupehxykntck.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY
# Cole: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4eXhlZ3BpanVwZWh4eWtudGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2Njk1MzQsImV4cCI6MjA0NjI0NTUzNH0.8c3EfEYwD1yOHwhJ16OPfMlh95xJADZgfWgxb5zTHmQ
```

### Passo 6: Redeploy com as variáveis
```bash
vercel --prod
```

**✅ PRONTO! Seu app estará no ar em https://seu-projeto.vercel.app**

---

## Método 2: Deploy via GitHub + Vercel (Recomendado para produção)

### Passo 1: Criar repositório no GitHub

1. Acesse https://github.com/new
2. Nome do repositório: **controle-restaurante**
3. Deixe como **Private** (recomendado)
4. **NÃO** marque "Initialize with README"
5. Clique em "Create repository"

### Passo 2: Fazer push do código

```bash
cd /tmp/cc-agent/59631402/project

# Inicializar git (se ainda não foi)
git init

# Adicionar todos os arquivos
git add .

# Fazer commit
git commit -m "Setup: Controle Restaurante - Versão Simplificada"

# Adicionar o remote (substitua SEU-USUARIO)
git remote add origin https://github.com/SEU-USUARIO/controle-restaurante.git

# Fazer push
git branch -M main
git push -u origin main
```

### Passo 3: Conectar ao Vercel

1. Acesse https://vercel.com/new
2. Clique em "Import Git Repository"
3. Selecione seu repositório **controle-restaurante**
4. Configure o projeto:
   - **Framework Preset:** Vite
   - **Root Directory:** ./
   - **Build Command:** `npm run build`
   - **Output Directory:** dist

### Passo 4: Adicionar Variáveis de Ambiente

Na seção "Environment Variables", adicione:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://ixyxegpijupehxykntck.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4eXhlZ3BpanVwZWh4eWtudGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2Njk1MzQsImV4cCI6MjA0NjI0NTUzNH0.8c3EfEYwD1yOHwhJ16OPfMlh95xJADZgfWgxb5zTHmQ` |

### Passo 5: Deploy

Clique em **"Deploy"** e aguarde 1-2 minutos.

**✅ PRONTO! Seu app estará no ar!**

---

## Método 3: Deploy Manual via Vercel Dashboard

### Passo 1: Preparar o projeto

```bash
cd /tmp/cc-agent/59631402/project
npm run build
```

### Passo 2: Fazer upload

1. Acesse https://vercel.com/new
2. Clique na aba "Deploy"
3. Arraste a pasta **dist/** para a área de upload
4. Configure as variáveis de ambiente (Passo 3)

### Passo 3: Adicionar Variáveis de Ambiente

Após o deploy, vá em:
- Settings → Environment Variables
- Adicione as duas variáveis mencionadas acima

### Passo 4: Redeploy

Clique em "Redeploy" para aplicar as variáveis.

---

## 🔧 Solução de Problemas

### Erro: "VITE_SUPABASE_URL is not defined"
- Certifique-se de adicionar as variáveis de ambiente
- Faça redeploy após adicionar

### Erro 404 ao acessar rotas
- O arquivo `vercel.json` já está configurado corretamente
- Não precisa fazer nada

### Build falha
```bash
# Teste localmente primeiro
npm install
npm run build
```

### App carrega mas dá erro de conexão
- Verifique se as variáveis de ambiente estão corretas
- Teste a URL do Supabase: https://ixyxegpijupehxykntck.supabase.co

---

## 📱 Testando o App

Após o deploy, teste as funcionalidades:

1. ✅ **Dashboard** - Deve carregar vazio (sem dados ainda)
2. ✅ **Escanear** - Upload de imagem → Processamento IA → Confirmação
3. ✅ **Histórico** - Lista de compras
4. ✅ **Boletos** - Gestão de contas
5. ✅ **Chat** - Aparece quando há produtos para categorizar

---

## 🎯 Próximos Passos

Depois do deploy:

1. Teste fazer upload de um cupom fiscal
2. Confirme os dados extraídos
3. Veja aparecer no Dashboard
4. Interaja com o Chat para categorizar produtos

**O app está 100% funcional!** 🚀

---

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs no Vercel Dashboard
2. Teste o build localmente com `npm run build`
3. Verifique se o Supabase está acessível
