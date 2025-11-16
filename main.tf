# Configure o provedor Google Cloud
provider "google" {
  project = var.project_id
  region  = var.region
}

# Habilita as APIs necessárias
resource "google_project_service" "cloud_run_api" {
  project = var.project_id
  service = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "sql_admin_api" {
  project = var.project_id
  service = "sqladmin.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "secret_manager_api" {
  project = var.project_id
  service = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "vpc_access_api" {
  project = var.project_id
  service = "vpcaccess.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "servicenetworking_api" {
  project = var.project_id
  service = "servicenetworking.googleapis.com"
  disable_on_destroy = false
}

# Cria uma rede VPC para a conexão privada
resource "google_compute_network" "vpc_network" {
  project = var.project_id
  name    = "financeiro-app-vpc"
  auto_create_subnetworks = true
}

# Cria um conector de acesso VPC Serverless para o Cloud Run
resource "google_vpc_access_connector" "connector" {
  project = var.project_id
  name    = "financeiro-app-vpc-connector"
  region  = var.region
  # Escolha um CIDR range que não se sobreponha aos seus ranges existentes
  # Este range é usado internamente pelo conector.
  ip_cidr_range = "10.8.0.0/28"
  network = google_compute_network.vpc_network.name
}

# Aloca um range de IP para a conexão privada do Cloud SQL
resource "google_compute_global_address" "private_ip_alloc" {
  project       = var.project_id
  name          = "financeiro-sql-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc_network.id
}

# Cria a conexão de serviço de rede privada para o Cloud SQL
resource "google_service_networking_connection" "vpc_connection" {
  network                 = google_compute_network.vpc_network.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_alloc.name]
  depends_on              = [google_compute_global_address.private_ip_alloc]
}

# Cloud SQL for PostgreSQL Instance
resource "google_sql_database_instance" "controle_financeiro_db" {
  project          = var.project_id
  name             = "controle-financeiro-db"
  database_version = "POSTGRES_15"
  region           = var.region
  settings {
    tier = "db-f1-micro" # Tier econômico para uso pessoal
    ip_configuration {
      ipv4_enabled    = false # Desabilita IP público
      private_network = google_compute_network.vpc_network.id
    }
    backup_configuration {
      enabled            = true
      binary_log_enabled = true
    }
  }
  depends_on = [google_service_networking_connection.vpc_connection]
}

# Cloud SQL Database
resource "google_sql_database" "financeiro_database" {
  project  = var.project_id
  name     = "financeiro_db"
  instance = google_sql_database_instance.controle_financeiro_db.name
  charset  = "UTF8"
  collation = "en_US.UTF8"
}

# Gera uma senha aleatória e forte para o usuário do banco de dados
resource "random_password" "db_password" {
  length           = 16
  special          = true
  override_special = "!@#$%^&*()-_=+"
}

# Secret Manager para armazenar a senha do banco de dados
resource "google_secret_manager_secret" "db_password_secret" {
  project = var.project_id
  secret_id = "financeiro-db-password"
  replication {
    automatic = true
  }
  depends_on = [google_project_service.secret_manager_api]
}

resource "google_secret_manager_secret_version" "db_password_secret_version" {
  secret = google_secret_manager_secret.db_password_secret.id
  secret_data = random_password.db_password.result
}

# Cloud SQL User
resource "google_sql_user" "financeiro_user" {
  project  = var.project_id
  name     = "financeiro_user"
  instance = google_sql_database_instance.controle_financeiro_db.name
  host     = "%" # Permite conexão de qualquer host dentro da VPC
  password = random_password.db_password.result
}

# Service Account para o Cloud Run
resource "google_service_account" "cloud_run_sa" {
  project      = var.project_id
  account_id   = "controle-financeiro-run-sa"
  display_name = "Service Account for Controle Financeiro Cloud Run"
}

# Permissões para o Service Account do Cloud Run
resource "google_project_iam_member" "cloud_run_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker" # Permite que o serviço Cloud Run seja invocado
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

resource "google_project_iam_member" "cloud_run_vpc_access_user" {
  project = var.project_id
  role    = "roles/vpcaccess.user" # Permite que o Cloud Run use o conector VPC
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Cloud Run Service
resource "google_cloud_run_v2_service" "controle_financeiro_api" {
  project  = var.project_id
  name     = "controle-financeiro-api"
  location = var.region

  template {
    containers {
      image = "gcr.io/${var.project_id}/finance-app:latest" # Imagem Docker a ser construída pelo Cloud Build
      ports {
        container_port = 8080
      }
      env {
        name  = "DB_USER"
        value = google_sql_user.financeiro_user.name
      }
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password_secret.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "DB_NAME"
        value = google_sql_database.financeiro_database.name
      }
      env {
        name  = "SPRING_DATASOURCE_URL"
        # Formato JDBC para Cloud SQL Socket Factory
        value = "jdbc:postgresql://google/${google_sql_database.financeiro_database.name}?cloudSqlInstance=${var.project_id}:${var.region}:${google_sql_database_instance.controle_financeiro_db.name}&socketFactory=com.google.cloud.sql.postgres.SocketFactory"
      }
    }
    scaling {
      min_instance_count = 0 # Escala para zero para economia
      max_instance_count = 5 # Ajuste conforme a necessidade
    }
    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "ALL_TRAFFIC" # Garante que o tráfego para o Cloud SQL passe pelo conector
    }
    service_account = google_service_account.cloud_run_sa.email
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.cloud_run_api,
    google_project_service.sql_admin_api,
    google_project_service.secret_manager_api,
    google_project_service.vpc_access_api,
    google_project_service.servicenetworking_api,
    google_sql_database_instance.controle_financeiro_db,
    google_secret_manager_secret_version.db_password_secret_version,
    google_vpc_access_connector.connector,
    google_service_account.cloud_run_sa,
    google_project_iam_member.cloud_run_sql_client,
    google_project_iam_member.cloud_run_secret_accessor,
    google_project_iam_member.cloud_run_vpc_access_user
  ]
}

# Output do URL do serviço Cloud Run
output "cloud_run_url" {
  description = "The URL of the deployed Cloud Run service."
  value       = google_cloud_run_v2_service.controle_financeiro_api.uri
}

# Output do IP privado da instância Cloud SQL (para referência)
output "cloud_sql_private_ip" {
  description = "The private IP address of the Cloud SQL instance."
  value       = google_sql_database_instance.controle_financeiro_db.private_ip_address
}

# Output do nome do usuário do banco de dados
output "db_user" {
  description = "The username for the Cloud SQL database."
  value       = google_sql_user.financeiro_user.name
}

# Output do nome do banco de dados
output "db_name" {
  description = "The name of the Cloud SQL database."
  value       = google_sql_database.financeiro_database.name
}

# Output do ID do Secret Manager para a senha do banco de dados
output "db_password_secret_id" {
  description = "The Secret Manager ID where the database password is stored."
  value       = google_secret_manager_secret.db_password_secret.secret_id
}
