#!/bin/bash

# Simple Docker Deployment using Docker Hub (Free)
# No Azure Container Registry needed

set -e

echo "🐳 FindHouse API - Simple Docker Deployment"
echo "==========================================="
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed."
    echo "Install from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Azure CLI
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed."
    exit 1
fi

# Login
if ! az account show &> /dev/null; then
    az login
fi

# Configuration
RESOURCE_GROUP="findhouse-rg"
CONTAINER_NAME="findhouse-api"
DOCKER_IMAGE="your-dockerhub-username/findhouse-api:latest"
DNS_LABEL="findhouse-api-$(date +%s | tail -c 6)"
PORT=5000

echo "📋 Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Container Name: $CONTAINER_NAME"
echo "  DNS Label: $DNS_LABEL"
echo ""

# Build image
echo "🐳 Building Docker image..."
docker build -t findhouse-api:latest .

echo ""
echo "📤 Next steps:"
echo "1. Push to Docker Hub:"
echo "   docker tag findhouse-api:latest YOUR_DOCKERHUB_USERNAME/findhouse-api:latest"
echo "   docker push YOUR_DOCKERHUB_USERNAME/findhouse-api:latest"
echo ""
echo "2. Deploy to Azure:"
echo "   Update DOCKER_IMAGE in this script, then run again"
echo ""
echo "Or use the simple deployment command:"
echo ""
echo "az container create \\"
echo "  --resource-group $RESOURCE_GROUP \\"
echo "  --name $CONTAINER_NAME \\"
echo "  --image YOUR_DOCKERHUB_USERNAME/findhouse-api:latest \\"
echo "  --dns-name-label $DNS_LABEL \\"
echo "  --ports $PORT \\"
echo "  --cpu 1 \\"
echo "  --memory 1 \\"
echo "  --environment-variables \\"
echo "    NODE_ENV=production \\"
echo "    PORT=$PORT \\"
echo "    MONGODB_URI='your_mongo_connection' \\"
echo "    JWT_SECRET='your_jwt_secret'"
echo ""
