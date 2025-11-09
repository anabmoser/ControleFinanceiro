# 💰 Sistema de Controle Financeiro

Sistema completo de gestão financeira com IA para processamento automático de cupons fiscais e boletos.

## ✨ Funcionalidades

- 📊 **Dashboard** - Visão geral de gastos e métricas
- 📤 **Upload de Documentos** - Processamento automático com IA (Claude 3.5 Sonnet)
- 💬 **Chat BI** - Consultas em linguagem natural sobre seus gastos
- 📈 **Relatórios** - Análises e gráficos detalhados
- 🔐 **Autenticação** - Login seguro com Supabase Auth

## 🛠️ Tecnologias

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions + Storage)
- **IA:** Claude 3.5 Sonnet (Anthropic)
- **Deploy:** Vercel

## 🚀 Deploy Rápido

### 1. Configurar Supabase

1. Crie um projeto em: https://supabase.com
2. Execute o script SQL em `supabase/migrations/` para criar as tabelas
3. Deploy das Edge Functions:
   ```bash
   npx supabase functions deploy processar-cupom
   npx supabase functions deploy processar-boleto
   npx supabase functions deploy chat-bi
   ```
4. Configure a variável `ANTHROPIC_API_KEY` nas Edge Functions

### 2. Deploy na Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/seu-usuario/seu-repo)

**Variáveis de ambiente necessárias:**
- `VITE_SUPABASE_URL` - URL do seu projeto Supabase
- `VITE_SUPABASE_ANON_KEY` - Chave anon pública do Supabase

### 3. Pronto! 🎉

Acesse sua aplicação e comece a usar.

## 📚 Documentação Completa

- [📖 Instruções de Uso](./INSTRUCOES.md)
- [🔧 Configuração da API](./CONFIGURACAO_API.md)
- [🚀 Guia de Deploy na Vercel](./GUIA_DEPLOY_VERCEL.md)

## 💻 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Copiar .env.example para .env
cp .env.example .env

# Editar .env com suas credenciais
nano .env

# Iniciar servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Visualizar build
npm run preview
```

## 🔑 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key
```

**Nota:** A chave `ANTHROPIC_API_KEY` deve ser configurada nas Edge Functions do Supabase, NÃO no `.env` do frontend.

## 📝 Scripts Disponíveis

```bash
npm run dev        # Inicia servidor de desenvolvimento
npm run build      # Cria build de produção
npm run preview    # Visualiza build de produção
npm run lint       # Verifica código com ESLint
npm run typecheck  # Verifica tipagem TypeScript
```

## 🐛 Resolução de Problemas

### "Variáveis de ambiente do Supabase não configuradas"
- Verifique se criou o arquivo `.env`
- Confirme se copiou as credenciais corretas do Supabase

### Upload de imagens não funciona
- Verifique se configurou `ANTHROPIC_API_KEY` nas Edge Functions do Supabase
- Veja os logs das Edge Functions no painel do Supabase

### Erro 404 ao navegar
- Verifique se o arquivo `vercel.json` está presente
- No desenvolvimento local, use `npm run dev` (não `npm run preview`)

## 📄 Estrutura do Projeto

```
.
├── src/
│   ├── components/      # Componentes React
│   ├── contexts/        # Contextos (Auth, etc)
│   ├── lib/            # Configurações (Supabase)
│   ├── pages/          # Páginas da aplicação
│   └── App.tsx         # Componente principal
├── supabase/
│   ├── functions/      # Edge Functions (Deno)
│   └── migrations/     # Scripts SQL
├── dist/              # Build de produção
├── .env.example       # Exemplo de variáveis de ambiente
├── vercel.json        # Configuração da Vercel
└── package.json       # Dependências
```

## 🔒 Segurança

- ✅ Row Level Security (RLS) habilitado em todas as tabelas
- ✅ Autenticação obrigatória para todas as operações
- ✅ Chaves secretas protegidas nas Edge Functions
- ✅ Upload de arquivos validado e limitado

## 📊 Banco de Dados

O sistema utiliza as seguintes tabelas:

- `suppliers` - Fornecedores
- `products` - Produtos normalizados
- `purchases` - Compras realizadas
- `purchase_items` - Itens de cada compra
- `bills` - Boletos a pagar
- `receipts` - Arquivos de cupons/boletos

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests.

## 📄 Licença

MIT

## 🆘 Suporte

Se tiver problemas:
1. Leia a [documentação completa](./INSTRUCOES.md)
2. Verifique o [guia de deploy](./GUIA_DEPLOY_VERCEL.md)
3. Abra uma issue no GitHub

---

**Desenvolvido com ❤️ usando React, Supabase e Claude AI**
