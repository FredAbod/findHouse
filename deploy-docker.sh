#!/bin/bash

# Docker + Azure Container Instances Deployment
# More flexible with regions and cost-effective

set -e

echo "🐳 FindHouse API - Docker Deployment to Azure Container Instances"
echo "=================================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed.${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed.${NC}"
    echo "Install from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Login check
echo -e "${YELLOW}🔐 Checking Azure login...${NC}"
if ! az account show &> /dev/null; then
    az login
fi

# Configuration
RESOURCE_GROUP="findhouse-rg"
LOCATION="eastus"  # ACI is more widely available
REGISTRY_NAME="findhouseregistry$(date +%s | tail -c 6)"  # Unique name
CONTAINER_NAME="findhouse-api"
IMAGE_NAME="findhouse-api"
PORT=5000

echo ""
echo -e "${GREEN}📋 Configuration:${NC}"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  Container Registry: $REGISTRY_NAME"
echo "  Container Name: $CONTAINER_NAME"
echo ""

read -p "Proceed with Docker deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Create resource group
echo -e "${YELLOW}📦 Creating resource group...${NC}"
az group create --name $RESOURCE_GROUP --location $LOCATION || {
    echo -e "${YELLOW}⚠️  Region $LOCATION not available. Trying centralus...${NC}"
    LOCATION="centralus"
    az group create --name $RESOURCE_GROUP --location $LOCATION || {
        echo -e "${RED}❌ Failed. Try: westus2, eastus2, or canadacentral${NC}"
        exit 1
    }
}

# Create Azure Container Registry (Basic SKU - ~$5/month)
echo -e "${YELLOW}🏗️  Creating Azure Container Registry...${NC}"
az acr create \
    --resource-group $RESOURCE_GROUP \
    --name $REGISTRY_NAME \
    --sku Basic \
    --admin-enabled true

# Get ACR credentials
echo -e "${YELLOW}🔑 Getting registry credentials...${NC}"
ACR_USERNAME=$(az acr credential show --name $REGISTRY_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $REGISTRY_NAME --query passwords[0].value -o tsv)
ACR_LOGIN_SERVER=$(az acr show --name $REGISTRY_NAME --query loginServer -o tsv)

# Build Docker image
echo -e "${YELLOW}🐳 Building Docker image...${NC}"
docker build -t $IMAGE_NAME:latest .

# Tag image for ACR
echo -e "${YELLOW}🏷️  Tagging image...${NC}"
docker tag $IMAGE_NAME:latest $ACR_LOGIN_SERVER/$IMAGE_NAME:latest

# Login to ACR
echo -e "${YELLOW}🔐 Logging into Azure Container Registry...${NC}"
echo $ACR_PASSWORD | docker login $ACR_LOGIN_SERVER --username $ACR_USERNAME --password-stdin

# Push image to ACR
echo -e "${YELLOW}📤 Pushing image to registry...${NC}"
docker push $ACR_LOGIN_SERVER/$IMAGE_NAME:latest

# Deploy to Azure Container Instances
echo -e "${YELLOW}🚀 Deploying to Azure Container Instances...${NC}"
az container create \
    --resource-group $RESOURCE_GROUP \
    --name $CONTAINER_NAME \
    --image $ACR_LOGIN_SERVER/$IMAGE_NAME:latest \
    --registry-login-server $ACR_LOGIN_SERVER \
    --registry-username $ACR_USERNAME \
    --registry-password $ACR_PASSWORD \
    --dns-name-label findhouse-api-$(date +%s | tail -c 6) \
    --ports $PORT \
    --cpu 1 \
    --memory 1 \
    --environment-variables \
        NODE_ENV=production \
        PORT=$PORT

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

# Get container URL
FQDN=$(az container show --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME --query ipAddress.fqdn -o tsv)
echo -e "${GREEN}🌍 Your API is available at:${NC}"
echo "   http://$FQDN:$PORT"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Set environment variables${NC}"
echo "   az container create --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME \\"
echo "     --image $ACR_LOGIN_SERVER/$IMAGE_NAME:latest \\"
echo "     --registry-login-server $ACR_LOGIN_SERVER \\"
echo "     --registry-username $ACR_USERNAME \\"
echo "     --registry-password $ACR_PASSWORD \\"
echo "     --dns-name-label findhouse-api \\"
echo "     --ports $PORT \\"
echo "     --environment-variables \\"
echo "       NODE_ENV=production \\"
echo "       PORT=$PORT \\"
echo "       MONGODB_URI='your_connection_string' \\"
echo "       JWT_SECRET='your_secret' \\"
echo "       # Add all your env vars here"
echo ""
echo -e "${GREEN}💰 Cost Estimate:${NC}"
echo "   Container Registry (Basic): ~\$5/month"
echo "   Container Instance: ~\$10-15/month (1vCPU, 1GB RAM)"
echo "   Total: ~\$15-20/month"
echo ""
echo -e "${GREEN}📊 View logs:${NC}"
echo "   az container logs --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME --follow"
echo ""
