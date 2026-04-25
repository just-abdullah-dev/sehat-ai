# Azure Deployment Guide (Docker)

This backend is container-ready and can run on Azure Container Apps or Azure App Service for Containers.

## 1. Prerequisites

- Azure subscription
- Azure CLI logged in (`az login`)
- Docker installed locally
- Resource group created

## 2. Build and Push Image to Azure Container Registry (ACR)

```bash
# Variables
RG=sehatai-rg
LOCATION=eastus
ACR=sehataiacr
IMAGE=sehatai-backend
TAG=v1

# Create ACR
az acr create --resource-group $RG --name $ACR --sku Basic --location $LOCATION

# Login and push
az acr login --name $ACR

docker build -t $ACR.azurecr.io/$IMAGE:$TAG --target production .
docker push $ACR.azurecr.io/$IMAGE:$TAG
```

## 3. Deploy to Azure Container Apps

```bash
# Variables
ENV_NAME=sehatai-env
APP_NAME=sehatai-backend-app

# Create Container Apps environment
az containerapp env create \
  --name $ENV_NAME \
  --resource-group $RG \
  --location $LOCATION

# Deploy app
az containerapp create \
  --name $APP_NAME \
  --resource-group $RG \
  --environment $ENV_NAME \
  --image $ACR.azurecr.io/$IMAGE:$TAG \
  --target-port 8000 \
  --ingress external \
  --registry-server $ACR.azurecr.io \
  --query properties.configuration.ingress.fqdn
```

Set required environment variables:

```bash
az containerapp update \
  --name $APP_NAME \
  --resource-group $RG \
  --set-env-vars \
    DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/sehatai_db?sslmode=require' \
    JWT_SECRET_KEY='CHANGE_ME' \
    JWT_ALGORITHM='HS256' \
    ACCESS_TOKEN_EXPIRE_MINUTES='10080' \
    REFRESH_TOKEN_EXPIRE_DAYS='7' \
    DEBUG='False' \
    PORT='8000' \
    WEB_CONCURRENCY='2' \
    ALLOWED_ORIGINS='https://your-frontend-domain.com'
```

## 4. Deploy to Azure App Service (Web App for Containers)

```bash
PLAN=sehatai-plan
WEBAPP=sehatai-backend-web

az appservice plan create \
  --name $PLAN \
  --resource-group $RG \
  --is-linux \
  --sku B1

az webapp create \
  --resource-group $RG \
  --plan $PLAN \
  --name $WEBAPP \
  --deployment-container-image-name $ACR.azurecr.io/$IMAGE:$TAG

az webapp config appsettings set \
  --resource-group $RG \
  --name $WEBAPP \
  --settings \
    WEBSITES_PORT=8000 \
    PORT=8000 \
    WEB_CONCURRENCY=2 \
    DATABASE_URL='postgresql://USER:PASSWORD@HOST:5432/sehatai_db?sslmode=require' \
    JWT_SECRET_KEY='CHANGE_ME' \
    JWT_ALGORITHM='HS256' \
    ACCESS_TOKEN_EXPIRE_MINUTES=10080 \
    REFRESH_TOKEN_EXPIRE_DAYS=7 \
    DEBUG=False \
    ALLOWED_ORIGINS='https://your-frontend-domain.com'
```

## 5. Health Checks

- Liveness/Readiness endpoint: `/health`
- Verify after deployment:

```bash
curl https://<your-domain>/health
```

## 6. Production Checklist

- Keep `DEBUG=False`
- Use strong random `JWT_SECRET_KEY`
- Use managed PostgreSQL with SSL (`sslmode=require`)
- Restrict CORS in `ALLOWED_ORIGINS`
- Enable monitoring/logging on Azure
- Store secrets in Azure Key Vault where possible
