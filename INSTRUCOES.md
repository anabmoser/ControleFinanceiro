# Sistema de Controle Financeiro - Instruções

## ✅ Sistema Completo Implementado

O Sistema de Controle Financeiro está totalmente funcional com as seguintes funcionalidades:

### 📊 Páginas Implementadas

1. **Dashboard** - Visão geral dos gastos
   - KPI: Gasto da Semana
   - KPI: Kg de Tomate (Semana)
   - Tabela: Boletos Próximos 7 dias
   - Tabela: Compras Recentes
   - Gráfico: Preço Médio Tomate por Semana (8 semanas)

2. **Upload de Documentos** - Processamento com IA
   - Drag-and-drop de imagens
   - Suporte para JPG, PNG e PDF
   - Processamento automático de Cupons Fiscais
   - Processamento automático de Boletos
   - Extração de dados com Claude AI

3. **Chat BI** - Consultas em linguagem natural
   - Perguntas sobre gastos e produtos
   - Análise de fornecedores
   - Consulta de boletos
   - Resumo da semana

### 🗄️ Banco de Dados

Todas as tabelas foram criadas no Supabase:
- ✅ suppliers (fornecedores)
- ✅ products (produtos)
- ✅ purchases (compras)
- ✅ purchase_items (itens das compras)
- ✅ bills (boletos)
- ✅ receipts (recibos/arquivos)

### 🤖 Edge Functions (Agentes de IA)

Três funções serverless foram implementadas:

1. **processar-cupom** (Agente 01)
   - Extrai dados de cupons fiscais usando Claude AI
   - Normaliza nomes de produtos (Tomate, Cebola, Arroz, etc)
   - Salva compras e itens no banco de dados
   - Faz upload automático da imagem para Supabase Storage

2. **processar-boleto** (Agente 02)
   - Extrai dados de boletos bancários
   - Salva no banco com status "scheduled"
   - Armazena código de barras e data de vencimento

3. **chat-bi** (Agente 03)
   - Processa perguntas em linguagem natural
   - Consultas SQL dinâmicas baseadas na pergunta
   - Funções implementadas:
     - Kg de produto na semana
     - Gasto por fornecedor
     - Preço médio nas últimas N semanas
     - Gasto total do período
     - Boletos a pagar
     - Resumo da semana

### 🔐 Autenticação

Sistema completo de autenticação com Supabase Auth:
- ✅ Registro de novos usuários
- ✅ Login com email/senha
- ✅ Logout
- ✅ Proteção de rotas
- ✅ Row Level Security (RLS) em todas as tabelas

## ⚙️ Configuração Necessária

### 1. Chave da API do Claude (Anthropic) - OBRIGATÓRIO

⚠️ **SEM ESTA CONFIGURAÇÃO O SISTEMA NÃO PROCESSARÁ IMAGENS!**

Para que o processamento de imagens funcione, você precisa configurar a chave da API do Claude:

**Passo a passo:**

1. **Obter a chave:**
   - Acesse: https://console.anthropic.com/
   - Crie uma conta (se ainda não tiver)
   - Vá em "API Keys"
   - Clique em "Create Key"
   - Copie a chave gerada (exemplo: `sk-ant-api03-...`)

2. **Configurar no Supabase:**
   - Acesse o painel do Supabase: https://supabase.com/dashboard
   - Selecione seu projeto
   - No menu lateral, vá em: **Project Settings** (ícone de engrenagem)
   - Clique em **Edge Functions**
   - Role até a seção **Environment Variables**
   - Clique em **Add Variable**
   - Nome: `ANTHROPIC_API_KEY`
   - Valor: Cole sua chave da API
   - Clique em **Save**

3. **Custo:**
   - O modelo Claude 3.5 Sonnet custa aproximadamente:
     - $3.00 por milhão de tokens de entrada
     - $15.00 por milhão de tokens de saída
   - Para processar imagens de cupons/boletos: ~$0.01 a $0.05 por imagem
   - Muito econômico para uso pessoal!

**Verificação:**
Após configurar, o sistema mostrará mensagens de erro mais claras se a chave não estiver funcionando.

### 2. Google Calendar API (OPCIONAL)

A integração com Google Calendar ainda não foi implementada. Para adicionar essa funcionalidade, você precisará:

1. Criar um projeto no Google Cloud Console
2. Habilitar a Google Calendar API
3. Criar credenciais OAuth 2.0
4. Implementar o fluxo de autenticação OAuth

**Nota:** O sistema funciona perfeitamente sem o Google Calendar. Os boletos são salvos normalmente no banco de dados.

## 🚀 Como Usar o Sistema

### 1. Primeiro Acesso

1. Abra o aplicativo no navegador
2. Clique em "Não tem conta? Cadastre-se"
3. Cadastre-se com seu email e senha
4. Faça login

### 2. Upload de Cupons Fiscais

1. Vá para "Upload de Documentos"
2. Arraste uma foto do cupom fiscal
3. Selecione "Cupom Fiscal"
4. Clique em "Processar Documento"
5. Aguarde a extração automática dos dados

**Resultado:**
- Compra salva na tabela `purchases`
- Itens extraídos e salvos em `purchase_items`
- Produtos normalizados automaticamente
- Imagem armazenada no Supabase Storage

### 3. Upload de Boletos

1. Vá para "Upload de Documentos"
2. Arraste uma foto do boleto
3. Selecione "Boleto"
4. Clique em "Processar Documento"

**Resultado:**
- Boleto salvo na tabela `bills`
- Status: "scheduled"
- Código de barras extraído
- Data de vencimento registrada

### 4. Consultas no Chat BI

Exemplos de perguntas que você pode fazer:

- "Quanto de tomate comprei esta semana?"
- "Qual o gasto por fornecedor?"
- "Preço médio do tomate nas últimas 8 semanas?"
- "Quanto gastei este mês?"
- "Quais boletos vou ter que pagar?"
- "Me dê um resumo da semana"

### 5. Dashboard

O dashboard é atualizado automaticamente com:
- Seus gastos da semana atual
- Quantidade de tomate comprada
- Boletos com vencimento nos próximos 7 dias
- Histórico de compras recentes
- Gráfico de evolução de preços

## 🔧 Regras de Normalização de Produtos

Os seguintes produtos são automaticamente normalizados:

- **Tomate** ← tomate, tomates, tomate italiano, tomate cereja, tomate rama
- **Cebola** ← cebola, cebolas, cebola pera, cebola branca, cebola roxa
- **Arroz Tipo 1** ← arroz, arroz tipo 1, arroz agulhinha
- **Feijão** ← feijão
- **Batata** ← batata
- **Alho** ← alho
- **Cenoura** ← cenoura

Você pode adicionar mais regras editando a Edge Function `processar-cupom`.

## 📱 Design Responsivo

O sistema foi desenvolvido com design mobile-first:
- ✅ Funciona em smartphones
- ✅ Funciona em tablets
- ✅ Funciona em desktops
- ✅ Menu lateral retrátil no mobile

## 🎨 Tecnologias Utilizadas

- **Frontend:** React + TypeScript + Vite
- **Estilização:** Tailwind CSS
- **Ícones:** Lucide React
- **Banco de Dados:** Supabase PostgreSQL
- **Autenticação:** Supabase Auth
- **Storage:** Supabase Storage
- **IA:** Claude 3.5 Sonnet (Anthropic)
- **Serverless:** Supabase Edge Functions (Deno)

## 🔒 Segurança

- ✅ Row Level Security (RLS) habilitado em todas as tabelas
- ✅ Usuários só veem seus próprios dados
- ✅ Autenticação obrigatória para todas as operações
- ✅ Upload de arquivos restrito a usuários autenticados
- ✅ Validação de tipos de arquivo (JPG, PNG, PDF)
- ✅ Limite de tamanho de arquivo (10MB)

## 📝 Próximos Passos Sugeridos

1. **Integração com Google Calendar**
   - Adicionar lembretes automáticos de boletos

2. **Relatórios Avançados**
   - Exportar dados para Excel/CSV
   - Gráficos de evolução de gastos
   - Comparativo mensal

3. **Melhorias no Chat BI**
   - Mais perguntas e consultas
   - Gráficos inline nas respostas
   - Histórico de conversas

4. **Gestão de Produtos**
   - Interface para editar produtos
   - Adicionar categorias personalizadas
   - Gerenciar regras de normalização

5. **Notificações**
   - Email para boletos próximos do vencimento
   - Resumo semanal por email
   - Alertas de gastos acima da média

## ⚠️ Importante

**LEMBRE-SE:** Para que o processamento de imagens funcione, você DEVE configurar a variável de ambiente `ANTHROPIC_API_KEY` no Supabase.

Sem essa chave, o upload de documentos não conseguirá extrair os dados automaticamente.

## 🆘 Suporte

Se tiver problemas:

1. Verifique o console do navegador (F12) para erros
2. Verifique os logs das Edge Functions no painel do Supabase
3. Confirme que a chave da API do Claude está configurada
4. Certifique-se de que está usando um navegador moderno

---

**Sistema desenvolvido e pronto para uso!** 🚀
