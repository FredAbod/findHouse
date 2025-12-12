# 🚀 Deploy FindHouse API to Azure Container Apps - Simple Guide

## Why Container Apps?
- ✅ No region restrictions (unlike App Service)
- ✅ Docker-based deployment
- ✅ Auto-scaling
- ✅ Zero-downtime deployments
- ✅ Cost-effective (~$13/month for basic setup)

---

## Step 1: Create Azure Container Registry (ACR) (Portal - 5 minutes)

1. **Go to Azure Portal:** https://portal.azure.com
2. **Search** for "Container registries" in the top search bar
3. **Click** "+ Create"

### Fill in the Form:

**Basics Tab:**
- **Subscription:** Your Azure Student subscription
- **Resource Group:** Click "Create new" → Name it `findhouse-rg`
- **Registry name:** `findhouseacr` (must be unique, lowercase, no hyphens)
- **Location:** Choose any region (no restrictions!)
  - East US
  - Central US
  - West US 2
  - etc.
- **SKU:** `Basic` (~$5/month for 10GB storage)

4. **Click** "Review + create" → "Create"
5. **Wait** 1-2 minutes for deployment
6. **Note down:**
   - Registry name: `findhouseacr` (or what you chose)
   - Login server: `findhouseacr.azurecr.io`

---

## Step 2: Create Container App (Portal - 5 minutes)

1. **Search** for "Container Apps" in the top search bar
2. **Click** "+ Create"

### Fill in the Form:

**Basics Tab:**
- **Subscription:** Your Azure Student subscription
- **Resource Group:** Select `findhouse-rg` (same as ACR)
- **Container app name:** `findhouse-api`
- **Region:** Same as your ACR
- **Container Apps Environment:** Click "Create new"
  - **Environment name:** `findhouse-env`
  - **Zone redundancy:** Disabled (to save cost)
  - Click "Create"

**Container Tab:**
- **Use quickstart image:** Uncheck this
- **Image source:** Azure Container Registry
- **Registry:** Select your `findhouseacr`
- **Image:** We'll set this later (choose any for now, or use `mcr.microsoft.com/azuredocs/containerapps-helloworld:latest`)
- **Image tag:** `latest`
- **CPU and Memory:** 0.25 CPU cores, 0.5 Gi memory (cheapest option)

**Ingress Tab:**
- **Ingress:** Enabled
- **Ingress traffic:** Accepting traffic from anywhere
- **Ingress type:** HTTP
- **Target port:** `5000` (your Node.js app port)

3. **Click** "Review + create" → "Create"
4. **Wait** 2-3 minutes for deployment
5. **Note down your app name:** `findhouse-api`

---

## Step 3: Set Up Azure Credentials for GitHub (Portal - 5 minutes)

### Create Service Principal:

1. **In Azure Portal**, click the Cloud Shell icon (top right, `>_` symbol)
2. **Choose Bash**
3. **Run this command** (replace `YOUR_SUBSCRIPTION_ID` with your actual ID):

```bash
# Get your subscription ID first
az account show --query id -o tsv

# Create service principal (replace <subscription-id> with output from above)
az ad sp create-for-rbac \
  --name "github-findhouse-deploy" \
  --role contributor \
  --scopes /subscriptions/f8b30ce7-c2d2-4e05-891c-4cf5f8d68e9f/resourceGroups/findhouse-rg \
  --sdk-auth
```

4. **Copy the entire JSON output** (looks like this):
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "...",
  "tenantId": "...",
  ...
}
```

### Add to GitHub Secrets:

1. **Go to your GitHub repo:** https://github.com/FredAbod/findHouse
2. **Click** "Settings" tab
3. **Click** "Secrets and variables" → "Actions"
4. **Add these 3 secrets** (click "New repository secret" for each):

   **Secret 1:**
   - Name: `AZURE_CREDENTIALS`
   - Value: Paste the entire JSON from step 3

   **Secret 2:**
   - Name: `ACR_LOGIN_SERVER`
   - Value: `findhouseacr.azurecr.io` (your ACR login server)

   **Secret 3:**
   - Name: `RESOURCE_GROUP`
   - Value: `findhouse-rg`

---

## Step 4: Configure Environment Variables (Portal - 5 minutes)

1. **Go to your Container App** in the portal
2. **Click** "Containers" (left menu)
3. **Click** "Edit and deploy"
4. **Click** the container name
5. **Scroll to "Environment variables"**
6. **Add each variable:**

### Required Variables:

```
NODE_ENV              = production
PORT                  = 5000
MONGODB_URI           = your_mongodb_atlas_connection_string
JWT_SECRET            = your_secure_jwt_secret_min_32_chars
CLOUDINARY_CLOUD_NAME = your_cloudinary_name
CLOUDINARY_API_KEY    = your_cloudinary_key
CLOUDINARY_API_SECRET = your_cloudinary_secret
GOOGLE_DRIVE_CLIENT_EMAIL = your_service_account_email
GOOGLE_DRIVE_PRIVATE_KEY  = your_private_key
EMAIL_HOST            = smtp.zoho.com
EMAIL_PORT            = 465
EMAIL_USER            = your_email@domain.com
EMAIL_PASSWORD        = your_email_password
SUPPORT_EMAIL         = support@domain.com
FRONTEND_URL          = https://your-frontend-url.com
```

7. **Click** "Save"
8. **Click** "Create" to deploy the revision

---

## Step 5: Deploy via GitHub Actions (Automatic)

**That's it! Now every time you push to `main`, it auto-deploys:**

```bash
git add .
git commit -m "Initial deployment to Azure Container Apps"
git push origin main
```

**Watch the deployment:**
- Go to GitHub repo → "Actions" tab
- See the build and deploy progress
- Wait 3-5 minutes for Docker build + deploy

---

## Step 6: Get Your App URL

1. **Go to your Container App** in Azure Portal
2. **Click** "Overview"
3. **Copy the "Application Url"** (looks like: `https://findhouse-api.xxx.azurecontainerapps.io`)

**Test endpoints:**
```bash
# Health check
https://findhouse-api.xxx.azurecontainerapps.io/health

# API root
https://findhouse-api.xxx.azurecontainerapps.io/

# Your API
https://findhouse-api.xxx.azurecontainerapps.io/api/properties
```

---

## 🐛 Troubleshooting

### Deployment Failed in GitHub Actions?
1. Check Actions tab for specific error
2. Verify all 3 GitHub secrets are set correctly
3. Make sure ACR name matches in workflow file

### Container App Not Starting?
1. Portal → Container App → "Log stream"
2. Check environment variables are set
3. Verify MongoDB connection string

### Can't Access App?
1. Check if revision is active: Portal → Revisions
2. Verify ingress is enabled and port is 5000
3. Test health endpoint: `/health`

---

## 💰 Costs

- **Container Registry (Basic):** ~$5/month (10GB storage)
- **Container App (0.25 CPU, 0.5GB):** ~$8-13/month
- **MongoDB Atlas M0:** $0/month (free tier)
- **GitHub Actions:** $0/month (free)

**Total: ~$13-18/month** ✅

---

## 🔄 Updating Your App

Just push to GitHub:

```bash
# Make your code changes
git add .
git commit -m "Updated feature X"
git push origin main

# GitHub Actions builds Docker image and deploys automatically!
# Zero-downtime deployment with rollback capability
```

---

## ✅ Next Steps

1. [ ] Create MongoDB Atlas cluster (if not done)
2. [ ] Set up Cloudinary account
3. [ ] Configure Google Drive API
4. [ ] Set up email service
5. [ ] Test all API endpoints
6. [ ] Connect your frontend

---

**That's it! No CLI needed, everything through the portal and GitHub! 🎉**
