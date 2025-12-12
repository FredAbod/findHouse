#!/bin/bash

# Azure Cost Monitoring Script
# Run this weekly to monitor your Azure spending

set -e

echo "💰 Azure Cost Monitor for FindHouse"
echo "===================================="
echo ""

# Check if logged in
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure. Running az login..."
    az login
fi

# Get account info
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
SUBSCRIPTION_NAME=$(az account show --query name -o tsv)

echo "📊 Subscription: $SUBSCRIPTION_NAME"
echo "🆔 ID: $SUBSCRIPTION_ID"
echo ""

# Get current month costs
echo "💵 Current Month Costs:"
echo "----------------------"

# Get cost for current month
az consumption usage list \
  --start-date $(date -d "$(date +%Y-%m-01)" +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d) \
  --query "[].{Service:name.value, Cost:pretaxCost}" \
  --output table 2>/dev/null || echo "⚠️  Cost data not available yet (may take 24-48 hours)"

echo ""

# List all resources with costs
echo "📦 Active Resources:"
echo "-------------------"
RESOURCE_GROUP="findhouse-rg"

if az group exists --name $RESOURCE_GROUP; then
    az resource list \
      --resource-group $RESOURCE_GROUP \
      --query "[].{Name:name, Type:type, Location:location}" \
      --output table
    
    echo ""
    
    # Get App Service pricing tier
    APP_SERVICES=$(az webapp list --resource-group $RESOURCE_GROUP --query "[].name" -o tsv)
    
    if [ ! -z "$APP_SERVICES" ]; then
        echo "🌐 App Service Pricing Tiers:"
        echo "----------------------------"
        for app in $APP_SERVICES; do
            PLAN=$(az webapp show --name $app --resource-group $RESOURCE_GROUP --query appServicePlanId -o tsv)
            PLAN_NAME=$(basename $PLAN)
            SKU=$(az appservice plan show --name $PLAN_NAME --resource-group $RESOURCE_GROUP --query "sku.name" -o tsv)
            echo "  $app: $SKU"
        done
        echo ""
    fi
else
    echo "⚠️  Resource group '$RESOURCE_GROUP' not found"
fi

# Cost estimates
echo "💡 Cost Estimates (per month):"
echo "------------------------------"
echo "  F1 (Free):        $0"
echo "  B1 (Basic):       ~$13"
echo "  B2 (Basic):       ~$26"
echo "  S1 (Standard):    ~$70"
echo ""
echo "  MongoDB Atlas M0: $0 (free forever)"
echo "  MongoDB Atlas M10: ~$57"
echo "  Cosmos DB Serverless: ~$5-20 (low traffic)"
echo ""

# Student credit remaining
echo "🎓 Student Credit Information:"
echo "-----------------------------"
echo "  Total Credit: $100"
echo "  Valid for: 12 months from activation"
echo "  Check remaining at: https://www.microsoftazuresponsorships.com/"
echo ""

# Recommendations
echo "💡 Cost Optimization Recommendations:"
echo "------------------------------------"
echo "  1. Use F1 (Free) tier for development/testing"
echo "  2. Upgrade to B1 only for production"
echo "  3. Stop App Service when not in use (B1+)"
echo "  4. Use MongoDB Atlas M0 (free) instead of paid DB"
echo "  5. Monitor costs weekly with this script"
echo "  6. Set up budget alerts in Azure Portal"
echo "  7. Delete unused resources immediately"
echo ""

# Quick commands
echo "🔧 Quick Commands:"
echo "-----------------"
echo "  Stop App:  az webapp stop --name <app-name> --resource-group $RESOURCE_GROUP"
echo "  Start App: az webapp start --name <app-name> --resource-group $RESOURCE_GROUP"
echo "  View logs: az webapp log tail --name <app-name> --resource-group $RESOURCE_GROUP"
echo "  Delete RG: az group delete --name $RESOURCE_GROUP --yes"
echo ""

# Check for high-cost resources
echo "⚠️  Cost Warnings:"
echo "-----------------"
az resource list --resource-group $RESOURCE_GROUP --query "[?type=='Microsoft.DocumentDB/databaseAccounts'].name" -o tsv > /dev/null 2>&1
if [ $? -eq 0 ]; then
    COSMOS_ACCOUNTS=$(az resource list --resource-group $RESOURCE_GROUP --query "[?type=='Microsoft.DocumentDB/databaseAccounts'].name" -o tsv)
    if [ ! -z "$COSMOS_ACCOUNTS" ]; then
        echo "  ⚠️  Cosmos DB detected - ensure you're using Serverless tier!"
    fi
fi

echo ""
echo "✅ Monitoring complete!"
echo ""
echo "📈 For detailed cost analysis, visit:"
echo "   https://portal.azure.com/#view/Microsoft_Azure_CostManagement/Menu/~/costanalysis"
