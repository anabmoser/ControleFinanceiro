# Estágio 1: Build da aplicação
FROM maven:3.9.5-eclipse-temurin-17 AS build

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos pom.xml primeiro para baixar as dependências e aproveitar o cache do Docker
COPY pom.xml .
RUN mvn dependency:go-offline

# Copia todo o código-fonte da aplicação
COPY src ./src

# Compila o projeto e empacota em um JAR executável
RUN mvn clean install -DskipTests

# Estágio 2: Criação da imagem final de execução
# Usa uma imagem JRE 17 slim para uma imagem final leve e segura
FROM eclipse-temurin:17-jre-focal AS final

# Define o diretório de trabalho
WORKDIR /app

# Copia o JAR executável do estágio de build
COPY --from=build /app/target/*.jar app.jar

# Expõe a porta que a aplicação escuta (padrão para muitas aplicações Java é 8080)
EXPOSE 8080

# Comando para executar a aplicação
ENTRYPOINT ["java", "-jar", "app.jar"]