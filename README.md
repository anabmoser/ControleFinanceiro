# Restaurant Purchase Tracker - Infrastructure

Este projeto contém a infraestrutura como código (IaC) para o aplicativo Restaurant Purchase Tracker usando Terraform e Google Cloud Platform.

## Arquivos do Projeto

- **Dockerfile**: Configuração para containerização da aplicação Java
- **main.tf**: Configuração principal do Terraform com todos os recursos GCP
- **variables.tf**: Definição das variáveis do Terraform
- **terraform.tfvars.example**: Exemplo de arquivo de configuração (copie para terraform.tfvars)

## Recursos Provisionados

Este Terraform provisiona:

### Infraestrutura de Rede
- VPC Network privada
- VPC Access Connector para Cloud Run
- Peering de rede privada para Cloud SQL

### Banco de Dados
- Cloud SQL PostgreSQL 15
- Banco de dados `financeiro_db`
- Usuário `financeiro_user` com senha gerada automaticamente
- Configuração de rede privada (sem IP público)

### Segurança
- Secret Manager para armazenar senha do banco
- Service Account dedicada para Cloud Run
- Permissões IAM mínimas necessárias

### Aplicação
- Cloud Run service para hospedar a aplicação
- Configuração de variáveis de ambiente
- Auto-scaling (0-5 instâncias)

## Instruções de Uso

### 1. Pré-requisitos

- [Terraform](https://www.terraform.io/downloads.html) instalado
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) instalado
- Projeto GCP criado
- Autenticação configurada:
  ```bash
  gcloud auth login
  gcloud config set project YOUR_PROJECT_ID
  gcloud auth application-default login
  ```

### 2. Configuração

1. **Clone ou baixe os arquivos** para um diretório local

2. **Configure as variáveis**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```
   
   Edite `terraform.tfvars` com seus valores:
   ```hcl
   project_id = "seu-project-id-gcp"
   region     = "southamerica-east1"  # ou sua região preferida
   ```

3. **Inicialize o Terraform**:
   ```bash
   terraform init
   ```

### 3. Deploy da Infraestrutura

1. **Planeje a execução**:
   ```bash
   terraform plan
   ```
   
2. **Aplique as mudanças**:
   ```bash
   terraform apply
   ```
   
   Digite `yes` quando solicitado.

### 4. Outputs Importantes

Após o deploy, o Terraform exibirá:
- **cloud_run_url**: URL do serviço Cloud Run
- **db_user**: Nome do usuário do banco
- **db_name**: Nome do banco de dados
- **db_password_secret_id**: ID do secret com a senha

### 5. Próximos Passos

Após a infraestrutura estar pronta:

1. **Build da imagem Docker**:
   ```bash
   # Configure o Docker para usar o GCR
   gcloud auth configure-docker
   
   # Build e push da imagem
   docker build -t gcr.io/YOUR_PROJECT_ID/finance-app:latest .
   docker push gcr.io/YOUR_PROJECT_ID/finance-app:latest
   ```

2. **Deploy da aplicação**:
   ```bash
   # Atualizar o Cloud Run com a nova imagem
   gcloud run deploy controle-financeiro-api \
     --image gcr.io/YOUR_PROJECT_ID/finance-app:latest \
     --region YOUR_REGION
   ```

## Estrutura de Custos

- **Cloud SQL**: db-f1-micro (tier econômico)
- **Cloud Run**: Pay-per-use, escala para zero
- **VPC**: Sem custos adicionais
- **Secret Manager**: Primeiros 6 secrets gratuitos

## Segurança

- ✅ Cloud SQL sem IP público
- ✅ Comunicação via rede privada
- ✅ Senhas geradas automaticamente
- ✅ Secrets gerenciados pelo Secret Manager
- ✅ Permissões IAM mínimas

## CI/CD Pipeline

O projeto inclui configuração completa de CI/CD com Cloud Build:

### Arquivo cloudbuild.yaml

O pipeline automatiza:
1. **Build Maven**: Compilação e empacotamento da aplicação Java
2. **Build Docker**: Criação da imagem Docker usando o Dockerfile multi-estágio
3. **Deploy Cloud Run**: Deploy automático da nova versão

### Configuração do Pipeline

1. **Habilitar APIs necessárias**:
   ```bash
   gcloud services enable cloudbuild.googleapis.com artifactregistry.googleapis.com
   ```

2. **Criar repositório Artifact Registry** (opcional):
   ```bash
   gcloud artifacts repositories create finance-app \
     --repository-format=docker \
     --location=southamerica-east1 \
     --description="Docker repository for finance-app"
   ```

3. **Configurar Cloud Build Trigger**:
   - Acesse Cloud Build > Triggers no console GCP
   - Conecte seu repositório GitHub
   - Configure trigger para branch `main`
   - Defina `_REGION` nas variáveis de substituição
   - Aponte para `/cloudbuild.yaml`

### Deploy Automático

Após configurar o trigger:
- ✅ Push para `main` → Build automático
- ✅ Testes e compilação Maven
- ✅ Build da imagem Docker
- ✅ Deploy no Cloud Run
- ✅ Versionamento com SHA do commit

## Limpeza

Para remover todos os recursos:
```bash
terraform destroy
```

⚠️ **Atenção**: Isso removerá permanentemente todos os dados!

## Troubleshooting

### Erro de APIs não habilitadas
Se você receber erros sobre APIs não habilitadas, aguarde alguns minutos após o `terraform apply` e execute novamente.

### Erro de permissões
Verifique se sua conta tem as permissões necessárias:
- Editor ou Owner no projeto
- Service Account Admin
- Cloud SQL Admin

### Problemas de conectividade
Verifique se o VPC Access Connector foi criado corretamente e se o Cloud Run está configurado para usá-lo.
