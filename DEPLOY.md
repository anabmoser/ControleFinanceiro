# Deploy Rápido no Vercel

## Passo a Passo (2 minutos)

### 1. Faça login no Vercel
Acesse: https://vercel.com

### 2. Importe este projeto

**Opção A: Via GitHub (Recomendado)**
- Faça upload deste projeto para GitHub
- No Vercel, clique "Add New Project"
- Importe o repositório
- Configure as variáveis de ambiente (passo 3)

**Opção B: Via Vercel CLI**
```bash
npm i -g vercel
vercel login
vercel --prod
```

### 3. Configure as Variáveis de Ambiente

No painel do Vercel, adicione:

```
VITE_SUPABASE_URL=https://ixyxegpijupehxykntck.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4eXhlZ3BpanVwZWh4eWtudGNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2Njk1MzQsImV4cCI6MjA0NjI0NTUzNH0.8c3EfEYwD1yOHwhJ16OPfMlh95xJADZgfWgxb5zTHmQ
```

### 4. Deploy
Clique em "Deploy" e aguarde 1-2 minutos.

### 5. Pronto!
Seu app estará online em: `https://seu-projeto.vercel.app`
