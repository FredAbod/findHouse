#!/bin/bash

# Quick Deploy Script for FindHouse API
# For manual deployments to Azure App Service

set -e

echo "🚀 FindHouse API - Quick Deploy"
echo "==============================="
echo ""

# Configuration
RESOURCE_GROUP="findhouse-rg"
WEB_APP_NAME=""

# Check if app name is provided
if [ -z "$1" ]; then
    echo "Usage: ./scripts/quick-deploy.sh <web-app-name>"
    echo ""
    echo "Example: ./scripts/quick-deploy.sh findhouse-api-12345"
    echo ""
    
    # Try to find existing app
    EXISTING_APPS=$(az webapp list --resource-group $RESOURCE_GROUP --query "[].name" -o tsv 2>/dev/null)
    if [ ! -z "$EXISTING_APPS" ]; then
        echo "Found existing apps in $RESOURCE_GROUP:"
        echo "$EXISTING_APPS"
        echo ""
        echo "Run: ./scripts/quick-deploy.sh <app-name>"
    fi
    exit 1
fi

WEB_APP_NAME=$1

echo "📦 Preparing deployment package..."
echo ""

# Create temporary deployment directory
DEPLOY_DIR="deployment-$(date +%s)"
mkdir -p $DEPLOY_DIR

# Copy necessary files
echo "  Copying application files..."
cp -r src $DEPLOY_DIR/
cp package.json $DEPLOY_DIR/
cp package-lock.json $DEPLOY_DIR/

# Install production dependencies
echo "  Installing production dependencies..."
cd $DEPLOY_DIR
npm ci --only=production --quiet
cd ..

# Create zip file
echo "  Creating deployment package..."
ZIP_FILE="deploy-$(date +%s).zip"
cd $DEPLOY_DIR
zip -r ../$ZIP_FILE . > /dev/null
cd ..

echo ""
echo "📤 Deploying to Azure..."
echo ""

# Deploy to Azure
az webapp deployment source config-zip \
  --resource-group $RESOURCE_GROUP \
  --name $WEB_APP_NAME \
  --src $ZIP_FILE

echo ""
echo "🧹 Cleaning up..."
rm -rf $DEPLOY_DIR
rm $ZIP_FILE

echo ""
echo "✅ Deployment complete!"
echo ""

# Get app URL
APP_URL=$(az webapp show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostName -o tsv)
echo "🌍 Your app is live at: https://$APP_URL"
echo ""

# Test health endpoint
echo "🏥 Testing health endpoint..."
sleep 5
curl -s https://$APP_URL/health | python3 -m json.tool || echo "Health check endpoint not responding yet (may take a minute)"

echo ""
echo "📊 View logs with:"
echo "   az webapp log tail --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
