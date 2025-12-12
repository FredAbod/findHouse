# Docker Deployment Guide for FindHouse API

## 🐳 Why Docker + Azure Container Instances?

✅ **Bypasses region restrictions** - ACI available in more regions  
✅ **Cheaper for low traffic** - Pay only for running time  
✅ **No app service plan needed** - Direct container deployment  
✅ **Easy to update** - Just rebuild and redeploy  

## 💰 Cost Comparison

| Solution | Monthly Cost | Best For |
|----------|-------------|----------|
| App Service F1 | $0 | Testing (limited hours) |
| App Service B1 | $13 | Production |
| **ACI (1vCPU, 1GB)** | **~$10-15** | **Low/Medium traffic** |
| ACI + ACR | ~$15-20 | Private images |

## 🚀 Quick Deployment (3 Options)

### Option 1: Manual Docker + ACI (Simplest)

```bash
# 1. Build your Docker image
docker build -t findhouse-api .

# 2. Test locally
docker run -p 5000:5000 --env-file .env findhouse-api

# 3. Push to Docker Hub (free)
docker login
docker tag findhouse-api YOUR_USERNAME/findhouse-api:latest
docker push YOUR_USERNAME/findhouse-api:latest

# 4. Deploy to Azure
az login

az group create --name findhouse-rg --location eastus

az container create \
  --resource-group findhouse-rg \
  --name findhouse-api \
  --image YOUR_USERNAME/findhouse-api:latest \
  --dns-name-label findhouse-api-unique123 \
  --ports 5000 \
  --cpu 1 \
  --memory 1 \
  --environment-variables \
    NODE_ENV=production \
    PORT=5000 \
    MONGODB_URI='your_connection_string' \
    JWT_SECRET='your_secret' \
    CLOUDINARY_CLOUD_NAME='your_cloud_name' \
    CLOUDINARY_API_KEY='your_key' \
    CLOUDINARY_API_SECRET='your_secret'
    # Add all env vars here
```

### Option 2: Using Automated Script

```bash
# Make executable
chmod +x deploy-docker.sh

# Run (includes ACR creation)
./deploy-docker.sh
```

### Option 3: Azure Portal

1. Go to https://portal.azure.com
2. Search "Container Instances"
3. Click "+ Create"
4. Fill in:
   - Resource Group: `findhouse-rg`
   - Container name: `findhouse-api`
   - Region: Any available
   - Image source: Docker Hub or other registry
   - Image: `YOUR_USERNAME/findhouse-api:latest`
   - OS type: Linux
   - Size: 1 vCPU, 1 GB memory
5. Advanced tab → Environment variables
   - Add all your env vars
6. Review + create

## 📝 Step-by-Step: Docker Hub Method (FREE)

### 1. Create Docker Hub Account
- Go to: https://hub.docker.com
- Sign up (free)
- Note your username

### 2. Build and Test Locally

```bash
cd findHouse

# Build image
docker build -t findhouse-api .

# Test locally with environment variables
docker run -p 5000:5000 \
  -e NODE_ENV=production \
  -e PORT=5000 \
  -e MONGODB_URI='your_mongo_uri' \
  -e JWT_SECRET='your_secret' \
  findhouse-api

# Test in browser: http://localhost:5000/health
```

### 3. Push to Docker Hub

```bash
# Login to Docker Hub
docker login
# Enter your Docker Hub username and password

# Tag image
docker tag findhouse-api:latest YOUR_DOCKERHUB_USERNAME/findhouse-api:latest

# Push
docker push YOUR_DOCKERHUB_USERNAME/findhouse-api:latest
```

### 4. Deploy to Azure Container Instances

```bash
# Login to Azure
az login

# Create resource group (try different regions if needed)
az group create --name findhouse-rg --location eastus

# Deploy container
az container create \
  --resource-group findhouse-rg \
  --name findhouse-api \
  --image YOUR_DOCKERHUB_USERNAME/findhouse-api:latest \
  --dns-name-label findhouse-api-$(date +%s) \
  --ports 5000 \
  --cpu 1 \
  --memory 1 \
  --environment-variables \
    NODE_ENV=production \
    PORT=5000 \
    MONGODB_URI='mongodb+srv://user:pass@cluster.mongodb.net/findhouse' \
    JWT_SECRET='your_minimum_32_character_secret_key_here' \
    CLOUDINARY_CLOUD_NAME='your_cloud_name' \
    CLOUDINARY_API_KEY='your_api_key' \
    CLOUDINARY_API_SECRET='your_api_secret' \
    EMAIL_HOST='smtp.zoho.com' \
    EMAIL_PORT='465' \
    EMAIL_USER='your_email@domain.com' \
    EMAIL_PASSWORD='your_password' \
    FRONTEND_URL='https://your-frontend.com'
```

### 5. Get Your API URL

```bash
# Get container details
az container show \
  --resource-group findhouse-rg \
  --name findhouse-api \
  --query "{FQDN:ipAddress.fqdn,IP:ipAddress.ip,Status:containers[0].instanceView.currentState.state}" \
  --output table

# Your API will be at: http://<FQDN>:5000
```

## 🔄 Update Deployment

```bash
# 1. Make code changes

# 2. Rebuild image
docker build -t findhouse-api .

# 3. Push to Docker Hub
docker tag findhouse-api YOUR_USERNAME/findhouse-api:latest
docker push YOUR_USERNAME/findhouse-api:latest

# 4. Restart container in Azure
az container restart --resource-group findhouse-rg --name findhouse-api

# Or delete and recreate (picks up new image)
az container delete --resource-group findhouse-rg --name findhouse-api --yes
# Then run create command again
```

## 📊 Monitoring

```bash
# View logs
az container logs --resource-group findhouse-rg --name findhouse-api --follow

# Check status
az container show --resource-group findhouse-rg --name findhouse-api

# Restart container
az container restart --resource-group findhouse-rg --name findhouse-api
```

## 🐛 Troubleshooting

### Container won't start
```bash
# Check logs
az container logs --resource-group findhouse-rg --name findhouse-api
```

### Can't access API
- Check if port 5000 is open
- Verify FQDN is correct
- Test health endpoint: `http://<FQDN>:5000/health`

### Out of memory
- Increase memory: `--memory 1.5` or `--memory 2`
- Check for memory leaks in logs

## 💡 CI/CD with Docker

Update `.github/workflows/azure-deploy.yml` for Docker:

```yaml
name: Deploy Docker to ACI

on:
  push:
    branches: [ main ]

env:
  DOCKER_IMAGE: ${{ secrets.DOCKERHUB_USERNAME }}/findhouse-api
  RESOURCE_GROUP: findhouse-rg
  CONTAINER_NAME: findhouse-api

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Login to Docker Hub
      uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}
    
    - name: Build and push Docker image
      run: |
        docker build -t ${{ env.DOCKER_IMAGE }}:latest .
        docker push ${{ env.DOCKER_IMAGE }}:latest
    
    - name: Azure Login
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}
    
    - name: Deploy to ACI
      run: |
        az container restart \
          --resource-group ${{ env.RESOURCE_GROUP }} \
          --name ${{ env.CONTAINER_NAME }}
```

## 🎯 Recommended Approach

**For Students on Budget:**
1. Use **Docker Hub** (free)
2. Deploy to **Azure Container Instances**
3. Use **1 vCPU, 1GB RAM** (~$10-15/month)
4. Set up **GitHub Actions** for auto-deployment

**Total Cost:** ~$10-15/month  
**Your $100 credit lasts:** 6-8 months

## ✅ Advantages Over App Service

- ✅ More regions available
- ✅ No app service plan needed
- ✅ Pay only for running time
- ✅ Easy to scale horizontally
- ✅ Simple Docker workflow
- ✅ Better for microservices

## 📞 Support

Issues? Check:
- Dockerfile exists and builds locally
- All env vars are set
- Container logs for errors
- Region availability

---

**Ready to deploy with Docker? Start with Option 1 (Docker Hub method)!** 🚀
