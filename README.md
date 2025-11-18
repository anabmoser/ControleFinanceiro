# Controle Restaurante

Sistema simplificado de controle financeiro para restaurantes, com upload e processamento automático de cupons fiscais e boletos usando IA.

## Características

- ✅ **Sem autenticação** - Acesso direto, ideal para uso privado
- ✅ **OCR com IA** - Extração automática de dados de cupons fiscais usando Claude 3.5 Sonnet
- ✅ **Confirmação manual** - Revise e corrija dados antes de salvar
- ✅ **Chat inteligente** - Aprendizado automático de produtos similares
- ✅ **Dashboard** - Visualização de gastos e compras
- ✅ **Gestão de boletos** - Controle de contas a pagar
- ✅ **100% em Português** - Interface totalmente em português

## Tecnologias

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **IA**: Claude 3.5 Sonnet (Anthropic)
- **Storage**: Supabase Storage
- **Hospedagem**: Vercel

## Configuração

### 1. Clone o projeto

```bash
git clone <seu-repositorio>
cd controle-restaurante
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://ixyxegpijupehxykntck.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui
```

### 4. Execute localmente

```bash
npm run dev
```

Acesse `http://localhost:5173`

## Deploy no Vercel

### Opção 1: Via GitHub (Recomendado)

1. Faça push do código para o GitHub
2. Acesse [vercel.com](https://vercel.com)
3. Clique em "Add New Project"
4. Importe seu repositório
5. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Clique em "Deploy"

### Opção 2: Via CLI

```bash
# Instale o Vercel CLI
npm i -g vercel

# Faça login
vercel login

# Deploy
vercel --prod
```

## Configuração do Supabase

O banco de dados já está configurado no projeto `ixyxegpijupehxykntck.supabase.co`.

As migrações já foram aplicadas e incluem:

- Tabela `products` - Catálogo de produtos
- Tabela `purchases` - Compras registradas
- Tabela `purchase_items` - Itens das compras
- Tabela `bills` - Boletos a pagar
- Tabela `product_learning` - Aprendizado de produtos
- Edge Function `processar-cupom-simples` - Processa cupons fiscais com IA
- Storage bucket `documents` - Armazena imagens dos cupons

## Como Usar

### 1. Escanear Cupom Fiscal

1. Clique em "Escanear" no menu
2. Selecione "Cupom Fiscal"
3. Faça upload da foto do cupom
4. Aguarde o processamento pela IA
5. Revise os dados extraídos
6. Corrija se necessário
7. Confirme para salvar

### 2. Chat de Aprendizado

O chat aparece automaticamente quando há produtos para categorizar:

1. Clique no ícone de chat no canto inferior direito
2. Responda às perguntas do assistente
3. Categorize novos produtos
4. O sistema aprende e associa automaticamente da próxima vez

### 3. Visualizar Dashboard

- Gastos da semana e do mês
- Compras recentes
- Boletos pendentes
- Gráficos semanais

### 4. Gerenciar Boletos

1. Clique em "Boletos" no menu
2. Veja boletos pendentes e pagos
3. Marque como pago quando necessário

## Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── ChatAprendizado.tsx
│   └── ConfirmacaoDados.tsx
├── pages/              # Páginas da aplicação
│   ├── Dashboard.tsx
│   ├── UploadSimples.tsx
│   ├── Historico.tsx
│   └── Boletos.tsx
├── lib/                # Configurações
│   └── supabase.ts
└── App.tsx             # Componente principal

supabase/
├── migrations/         # Migrações do banco
└── functions/          # Edge Functions
    └── processar-cupom-simples/
```

## Observações Importantes

- **Uso Privado**: Este app não tem autenticação, ideal para uso pessoal
- **Chave da API exposta**: OK para apps privados, a ANON_KEY é segura para frontend
- **IA Claude 3.5 Sonnet**: Melhor precisão para OCR de cupons brasileiros
- **Sem modo offline**: Requer conexão com internet
- **Português**: Interface 100% em português do Brasil

## Suporte

Para problemas ou dúvidas:
1. Verifique se as variáveis de ambiente estão corretas
2. Confirme que o projeto Supabase está ativo
3. Verifique se a ANTHROPIC_API_KEY está configurada no Supabase

## Licença

Uso privado - Restaurante pessoal
