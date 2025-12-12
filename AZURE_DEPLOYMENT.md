# 🚀 Azure Deployment Guide for FindHouse API

**Optimized for Azure Student Account ($100 credit)**

## 📋 Table of Contents
- [Architecture Overview](#architecture-overview)
- [Cost Breakdown](#cost-breakdown)
- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
- [Step-by-Step Setup](#step-by-step-setup)
- [CI/CD Configuration](#cicd-configuration)
- [Environment Variables](#environment-variables)
- [Monitoring & Optimization](#monitoring--optimization)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

**Recommended Architecture (Cost-Optimized):**

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub Repository                     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│        GitHub Actions / Azure DevOps Pipeline           │
│              (Free for public repos)                     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│      Azure App Service (Linux, B1 Basic - $13/mo)       │
│              OR F1 Free (for testing)                    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│     MongoDB Atlas (Free M0 tier - 512MB storage)        │
│              OR Azure Cosmos DB                          │
└─────────────────────────────────────────────────────────┘
```

---

## 💰 Cost Breakdown

### **Option 1: Ultra Budget (FREE for 3+ months)**
- **App Service**: F1 Free tier (1 GB RAM, 60 min/day compute)
- **Database**: MongoDB Atlas M0 (512MB, free forever)
- **Storage**: Cloudinary Free (10GB storage, 20GB bandwidth)
- **CI/CD**: GitHub Actions (free for public repos)
- **Total**: $0/month + use student credits elsewhere

### **Option 2: Recommended Production (Budget)**
- **App Service**: B1 Basic (~$13/month)
- **Database**: MongoDB Atlas M0 (free) or M10 ($0.08/hr = ~$57/month)
- **Application Insights**: Free tier (5GB/month)
- **Total**: ~$13-70/month depending on DB choice

### **Option 3: Azure Cosmos DB (Serverless)**
- **App Service**: B1 Basic (~$13/month)
- **Cosmos DB**: Serverless (pay per request, ~$5-20/month for low traffic)
- **Total**: ~$18-33/month

### **My Recommendation for Students:**
Start with **Option 1 (FREE)** for development/testing, then scale to **Option 2 with MongoDB Atlas M0** (only $13/month) for production.

---

## 📝 Prerequisites

### 1. **Install Azure CLI**
```bash
# Windows (PowerShell as admin)
winget install -e --id Microsoft.AzureCLI

# Or download from:
# https://aka.ms/installazurecliwindows

# Verify installation
az --version
az login
```

### 2. **Install Git** (if not already installed)
```bash
winget install -e --id Git.Git
```

### 3. **Azure Account Setup**
- Activate your Azure Student account at: https://azure.microsoft.com/en-us/free/students/
- Verify you have $100 credit
- Enable Azure DevOps (optional): https://dev.azure.com

### 4. **Create MongoDB Atlas Account** (Recommended)
- Sign up at: https://www.mongodb.com/cloud/atlas
- Create a free M0 cluster (512MB)
- Whitelist Azure IP addresses: `0.0.0.0/0` (or specific IPs)
- Get connection string

---

## 🎯 Deployment Options

### **Option A: GitHub Actions (Recommended - 100% Free)**
- ✅ Free for public and private repos
- ✅ Simple setup
- ✅ Great for student projects
- ✅ 2,000 minutes/month free

### **Option B: Azure DevOps Pipelines**
- ✅ Free tier: 1,800 minutes/month
- ✅ Better Azure integration
- ✅ More enterprise features
- ⚠️ Requires additional setup

### **Option C: Manual Deployment**
- ✅ No pipeline needed
- ✅ Direct control
- ❌ No automation
- ❌ Manual updates

---

## 🚀 Step-by-Step Setup

### **STEP 1: Prepare Your Application**

1. **Add health check endpoint** to `src/server.js`:
```javascript
// Add this before your other routes
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

2. **Update your package.json** (ensure start script exists):
```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  }
}
```

3. **Update server.js to use PORT env variable**:
```javascript
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

### **STEP 2: Create Azure Resources**

#### **Method 1: Using Azure Portal (Beginner-Friendly)**

1. **Go to Azure Portal**: https://portal.azure.com

2. **Create Resource Group**:
   - Click "Resource groups" → "+ Create"
   - Name: `findhouse-rg`
   - Region: `East US` (cheapest)
   - Click "Review + Create"

3. **Create App Service**:
   - Search "App Services" → "+ Create"
   - Resource Group: `findhouse-rg`
   - Name: `findhouse-api-[yourname]` (must be globally unique)
   - Publish: `Code`
   - Runtime stack: `Node 18 LTS`
   - Operating System: `Linux`
   - Region: `East US`
   - Pricing: `F1 (Free)` for testing or `B1 (Basic)` for production
   - Click "Review + Create"

#### **Method 2: Using Azure CLI (DevOps Way)**

```bash
# Login to Azure
az login

# Set variables
RESOURCE_GROUP="findhouse-rg"
LOCATION="eastus"
APP_SERVICE_PLAN="findhouse-plan"
WEB_APP_NAME="findhouse-api-$(date +%s)"  # Unique name

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create App Service Plan (F1 Free tier)
az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --sku F1 \
  --is-linux

# For production, use B1 instead:
# --sku B1

# Create Web App
az webapp create \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --runtime "NODE:18-lts"

# Configure Node version
az webapp config appsettings set \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings WEBSITE_NODE_DEFAULT_VERSION="~18"

# Enable logging
az webapp log config \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --application-logging filesystem \
  --level information

echo "✅ Web App Created: https://$WEB_APP_NAME.azurewebsites.net"
```

---

### **STEP 3: Configure Environment Variables**

#### **Option A: Azure Portal**
1. Go to your App Service
2. Click "Configuration" → "Application settings"
3. Add each variable from your `.env` file:

#### **Option B: Azure CLI**
```bash
WEB_APP_NAME="your-app-name"
RESOURCE_GROUP="findhouse-rg"

az webapp config appsettings set \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    NODE_ENV="production" \
    PORT="8080" \
    MONGODB_URI="your_mongodb_atlas_connection_string" \
    JWT_SECRET="your_secure_jwt_secret_min_32_chars" \
    CLOUDINARY_CLOUD_NAME="your_cloudinary_name" \
    CLOUDINARY_API_KEY="your_cloudinary_key" \
    CLOUDINARY_API_SECRET="your_cloudinary_secret" \
    GOOGLE_DRIVE_CLIENT_EMAIL="your_service_account_email" \
    GOOGLE_DRIVE_PRIVATE_KEY="your_private_key" \
    EMAIL_HOST="smtp.zoho.com" \
    EMAIL_PORT="465" \
    EMAIL_USER="your_email@domain.com" \
    EMAIL_PASSWORD="your_password" \
    SUPPORT_EMAIL="support@domain.com" \
    FRONTEND_URL="https://your-frontend-url.com"
```

**⚠️ IMPORTANT:** For `GOOGLE_DRIVE_PRIVATE_KEY`, the newlines must be preserved. In Azure, either:
- Use `\n` in the string, OR
- Add it through the portal where you can paste the actual key

---

### **STEP 4: Set Up CI/CD**

#### **Option A: GitHub Actions (Recommended)**

1. **Get Publish Profile from Azure**:
```bash
az webapp deployment list-publishing-profiles \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --xml
```

2. **Add Secret to GitHub**:
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - Value: Paste the entire XML from step 1
   - Click "Add secret"

3. **Update `.github/workflows/azure-deploy.yml`**:
   - Change `AZURE_WEBAPP_NAME` to your actual app name
   - Commit and push to `main` branch

4. **Verify Deployment**:
   - Go to Actions tab in GitHub
   - Watch the deployment progress
   - Check logs for any errors

#### **Option B: Azure DevOps**

1. **Create Azure DevOps Project**:
   - Go to: https://dev.azure.com
   - Create new project: `findhouse`

2. **Create Service Connection**:
   - Project Settings → Service connections
   - New service connection → Azure Resource Manager
   - Authentication: Service principal (automatic)
   - Scope: Subscription
   - Name: `Azure-Student-Subscription`

3. **Create Pipeline**:
   - Pipelines → New Pipeline
   - Choose: Azure Repos Git (or GitHub)
   - Select your repository
   - Existing Azure Pipelines YAML file
   - Path: `/azure-pipelines.yml`
   - Update `webAppName` variable in the YAML
   - Save and run

4. **Configure Environment**:
   - Pipelines → Environments
   - Create "Production" environment
   - Add approvals if needed (optional)

---

### **STEP 5: Database Setup**

#### **Option A: MongoDB Atlas (Recommended - Free)**

1. **Create Cluster**:
   - Go to: https://cloud.mongodb.com
   - Create free M0 cluster
   - Region: Choose closest to `East US`
   - Cluster name: `findhouse-cluster`

2. **Configure Access**:
   - Database Access → Add new database user
   - Username: `findhouse-app`
   - Password: Generate secure password
   - Database User Privileges: `Read and write to any database`

3. **Network Access**:
   - Network Access → Add IP Address
   - Add: `0.0.0.0/0` (allow from anywhere)
   - ⚠️ For production, add specific Azure IPs

4. **Get Connection String**:
   - Clusters → Connect → Connect your application
   - Driver: Node.js
   - Copy connection string
   - Replace `<password>` with your actual password
   - Add to Azure App Settings as `MONGODB_URI`

#### **Option B: Azure Cosmos DB (MongoDB API)**

```bash
# Create Cosmos DB account (Serverless for cost optimization)
COSMOS_ACCOUNT_NAME="findhouse-cosmos"

az cosmosdb create \
  --name $COSMOS_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --kind MongoDB \
  --server-version 4.2 \
  --capabilities EnableServerless

# Get connection string
az cosmosdb keys list \
  --name $COSMOS_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP \
  --type connection-strings \
  --query "connectionStrings[0].connectionString" -o tsv
```

**Cost Note**: Serverless Cosmos DB costs ~$0.25 per million requests + storage. For low traffic, this can be $5-10/month.

---

### **STEP 6: Configure CORS**

Add CORS configuration to Azure App Service:

```bash
az webapp cors add \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --allowed-origins https://your-frontend-domain.com http://localhost:3000
```

Or in `src/server.js`, update:
```javascript
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://your-frontend-domain.com']
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
```

---

## 📊 Monitoring & Optimization

### **1. Enable Application Insights (Free Tier)**

```bash
# Create Application Insights
az monitor app-insights component create \
  --app findhouse-insights \
  --location $LOCATION \
  --resource-group $RESOURCE_GROUP \
  --application-type Node.JS

# Link to App Service
INSTRUMENTATION_KEY=$(az monitor app-insights component show \
  --app findhouse-insights \
  --resource-group $RESOURCE_GROUP \
  --query instrumentationKey -o tsv)

az webapp config appsettings set \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY=$INSTRUMENTATION_KEY
```

### **2. Enable Auto-Scaling (B1+ tier only)**

For production, configure auto-scaling:
- Azure Portal → App Service → Scale out
- Rules: Scale when CPU > 70%
- Min instances: 1, Max: 3 (to control costs)

### **3. Set Up Alerts**

```bash
# CPU alert
az monitor metrics alert create \
  --name "High CPU Alert" \
  --resource-group $RESOURCE_GROUP \
  --scopes /subscriptions/{subscription-id}/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$WEB_APP_NAME \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m

# Memory alert
az monitor metrics alert create \
  --name "High Memory Alert" \
  --resource-group $RESOURCE_GROUP \
  --scopes /subscriptions/{subscription-id}/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Web/sites/$WEB_APP_NAME \
  --condition "avg MemoryPercentage > 85" \
  --window-size 5m \
  --evaluation-frequency 1m
```

### **4. Cost Monitoring**

- Go to: Cost Management + Billing
- Set up budget alerts:
  - Budget: $30/month
  - Alert at: 80%, 100%, 120%
- Monitor daily costs

---

## 💡 Cost Optimization Tips

### **Immediate Savings:**

1. **Use F1 Free Tier for Development**
   - Switch to F1 during non-peak hours
   - Use B1 only for production/demos

2. **Stop/Start App Service When Not in Use**
```bash
# Stop the app (saves money on B1+)
az webapp stop --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP

# Start when needed
az webapp start --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP
```

3. **Use MongoDB Atlas Free Tier**
   - M0 is free forever
   - 512MB storage is enough for most student projects

4. **Optimize Images & Videos**
   - Cloudinary free tier: 10GB storage
   - Use Google Drive for large files (free 15GB)

5. **Enable Compression**
Add to `src/server.js`:
```javascript
const compression = require('compression');
app.use(compression());
```

6. **Clean Up Unused Resources**
```bash
# List all resources in the group
az resource list --resource-group $RESOURCE_GROUP --output table

# Delete entire resource group when done testing
az group delete --name $RESOURCE_GROUP --yes --no-wait
```

### **Monthly Cost Estimate:**
- **Development**: $0 (F1 + MongoDB Atlas M0)
- **Light Production**: $13 (B1 + MongoDB Atlas M0)
- **Full Production**: $70 (B1 + MongoDB Atlas M10 + Cosmos DB backup)

---

## 🐛 Troubleshooting

### **Issue 1: App Not Starting**

**Check logs:**
```bash
# Live log stream
az webapp log tail --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP

# Or in portal: App Service → Monitoring → Log stream
```

**Common fixes:**
- Verify `start` script in package.json
- Check PORT environment variable
- Ensure all dependencies are in `dependencies` (not `devDependencies`)

### **Issue 2: Database Connection Failed**

- Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0`
- Check connection string format
- Test connection locally first
- Verify network access in MongoDB Atlas

### **Issue 3: Deployment Failed**

```bash
# Check deployment logs
az webapp log deployment show --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP

# Redeploy manually
az webapp deployment source sync --name $WEB_APP_NAME --resource-group $RESOURCE_GROUP
```

### **Issue 4: High Costs**

- Check Cost Management dashboard
- Verify you're on F1/B1 tier (not higher)
- Stop app when not in use
- Review Application Insights data retention (reduce to 30 days)

### **Issue 5: Out of Memory (F1 Tier)**

F1 has only 1GB RAM. Options:
1. Optimize your code
2. Upgrade to B1 (1.75GB RAM)
3. Add memory monitoring and restart on threshold

---

## 📚 Additional Resources

- **Azure for Students**: https://azure.microsoft.com/en-us/free/students/
- **Azure App Service Docs**: https://docs.microsoft.com/en-us/azure/app-service/
- **MongoDB Atlas**: https://docs.atlas.mongodb.com/
- **GitHub Actions for Azure**: https://github.com/Azure/actions
- **Cost Calculator**: https://azure.microsoft.com/en-us/pricing/calculator/

---

## 🎓 Next Steps

1. ✅ Set up monitoring and alerts
2. ✅ Configure custom domain (optional, ~$10/year)
3. ✅ Add SSL certificate (free with App Service)
4. ✅ Set up staging environment
5. ✅ Implement backup strategy
6. ✅ Document API with Swagger/OpenAPI

---

## 📞 Support

For Azure Student support:
- Email: azureforedu@microsoft.com
- Chat: Azure Portal → Help + Support

**Remember:** Your $100 credit lasts 12 months. Monitor usage weekly!

---

**Happy Deploying! 🚀**
