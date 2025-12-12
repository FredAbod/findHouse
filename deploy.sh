#!/bin/bash

# Azure Deployment Script for FindHouse API
# This script helps with manual deployment and Azure resource setup

set -e

echo "🚀 FindHouse API - Azure Deployment Helper"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed. Please install it first.${NC}"
    echo "Visit: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Login check
echo -e "${YELLOW}🔐 Checking Azure login status...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${YELLOW}Please log in to Azure...${NC}"
    az login
fi

# Variables (customize these)
RESOURCE_GROUP="findhouse-rg"
LOCATION="eastus"  # Cheapest region for students
APP_SERVICE_PLAN="findhouse-plan"
WEB_APP_NAME="findhouse-api-$(date +%s)"  # Unique name with timestamp
NODE_VERSION="18-lts"

echo ""
echo -e "${GREEN}📋 Configuration:${NC}"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  App Service Plan: $APP_SERVICE_PLAN"
echo "  Web App Name: $WEB_APP_NAME"
echo ""

read -p "Do you want to proceed with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Create resource group
echo -e "${YELLOW}📦 Creating resource group...${NC}"
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create App Service Plan (F1 Free tier)
echo -e "${YELLOW}🏗️  Creating App Service Plan (Free tier)...${NC}"
az appservice plan create \
    --name $APP_SERVICE_PLAN \
    --resource-group $RESOURCE_GROUP \
    --sku F1 \
    --is-linux

# Create Web App
echo -e "${YELLOW}🌐 Creating Web App...${NC}"
az webapp create \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --plan $APP_SERVICE_PLAN \
    --runtime "NODE:$NODE_VERSION"

# Configure deployment from local git (optional)
echo -e "${YELLOW}🔧 Configuring deployment settings...${NC}"
az webapp config appsettings set \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings NODE_ENV=production

# Get deployment credentials
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${GREEN}🔑 To get publish profile for GitHub Actions:${NC}"
echo "az webapp deployment list-publishing-profiles --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --xml"
echo ""
echo -e "${GREEN}🌍 Your app URL:${NC}"
az webapp show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostName -o tsv
echo ""
echo -e "${YELLOW}⚠️  Don't forget to:${NC}"
echo "  1. Set up environment variables in Azure Portal"
echo "  2. Configure MongoDB connection (use Azure Cosmos DB or MongoDB Atlas)"
echo "  3. Update CORS settings"
echo "  4. Set up Application Insights for monitoring"
echo ""
echo -e "${GREEN}💰 Cost optimization tips:${NC}"
echo "  - Use F1 (Free) tier for development/testing"
echo "  - Upgrade to B1 (~\$13/month) for production"
echo "  - Use MongoDB Atlas free tier (M0)"
echo "  - Monitor usage with Azure Cost Management"
