# Azure Setup Checklist for FindHouse API

## Pre-Deployment Checklist

### ✅ Azure Account
- [ ] Azure Student account activated ($100 credit)
- [ ] Azure CLI installed and configured
- [ ] Logged in to Azure (`az login`)
- [ ] Verified subscription: `az account show`

### ✅ Database Setup
- [ ] MongoDB Atlas account created
- [ ] Free M0 cluster created
- [ ] Database user created with read/write permissions
- [ ] Network access configured (0.0.0.0/0 or specific IPs)
- [ ] Connection string obtained and tested

### ✅ External Services
- [ ] Cloudinary account created (for images)
- [ ] Cloudinary credentials obtained
- [ ] Google Drive API enabled (for videos)
- [ ] Service account created and JSON key downloaded
- [ ] Email service configured (Zoho/Gmail)
- [ ] Email credentials tested

### ✅ Code Preparation
- [ ] Health check endpoint added (`/health`)
- [ ] Root endpoint added (`/`)
- [ ] PORT environment variable used
- [ ] All secrets removed from code (use env vars)
- [ ] `.gitignore` includes `.env` file
- [ ] Production dependencies in `dependencies` section

---

## Deployment Checklist

### ✅ Azure Resources Created
- [ ] Resource Group: `findhouse-rg`
- [ ] App Service Plan: Free (F1) or Basic (B1)
- [ ] Web App: Node 18 LTS on Linux
- [ ] Application Insights (optional, free tier)

### ✅ Environment Variables Set
```bash
# Required variables
- [ ] NODE_ENV=production
- [ ] PORT=8080
- [ ] MONGODB_URI=mongodb+srv://...
- [ ] JWT_SECRET=<min-32-chars>
- [ ] CLOUDINARY_CLOUD_NAME
- [ ] CLOUDINARY_API_KEY
- [ ] CLOUDINARY_API_SECRET
- [ ] GOOGLE_DRIVE_CLIENT_EMAIL
- [ ] GOOGLE_DRIVE_PRIVATE_KEY
- [ ] EMAIL_HOST
- [ ] EMAIL_PORT
- [ ] EMAIL_USER
- [ ] EMAIL_PASSWORD
- [ ] SUPPORT_EMAIL
- [ ] FRONTEND_URL
```

### ✅ CI/CD Setup (Choose One)

#### Option A: GitHub Actions
- [ ] Publish profile downloaded from Azure
- [ ] Secret `AZURE_WEBAPP_PUBLISH_PROFILE` added to GitHub
- [ ] `.github/workflows/azure-deploy.yml` committed
- [ ] `AZURE_WEBAPP_NAME` updated in workflow
- [ ] Push to main branch and verify deployment

#### Option B: Azure DevOps
- [ ] Azure DevOps project created
- [ ] Service connection configured
- [ ] `azure-pipelines.yml` committed
- [ ] Pipeline created and run successfully

### ✅ Post-Deployment
- [ ] App URL accessible: `https://<app-name>.azurewebsites.net`
- [ ] Health check working: `https://<app-name>.azurewebsites.net/health`
- [ ] Test API endpoints
- [ ] Verify database connection
- [ ] Check file uploads work
- [ ] Test email sending
- [ ] CORS configured for frontend

---

## Configuration Checklist

### ✅ CORS Settings
- [ ] Frontend URL added to allowed origins
- [ ] Localhost added for development (if needed)
- [ ] Credentials enabled if using cookies/sessions

### ✅ Logging & Monitoring
- [ ] Application logging enabled
- [ ] Log stream accessible
- [ ] Application Insights configured (optional)
- [ ] Alerts set up for errors/high CPU

### ✅ Security
- [ ] HTTPS enforced (automatic with App Service)
- [ ] Environment variables not exposed in logs
- [ ] JWT secret is strong (min 32 characters)
- [ ] Database has authentication enabled
- [ ] API rate limiting configured
- [ ] Input validation in place

### ✅ Performance
- [ ] Compression middleware added
- [ ] Database indexes created
- [ ] Large files stored externally (Cloudinary/Google Drive)
- [ ] Connection pooling configured for MongoDB

---

## Cost Optimization Checklist

### ✅ Immediate Savings
- [ ] Using F1 (Free) tier for development
- [ ] Using MongoDB Atlas M0 (free tier)
- [ ] Cloudinary free tier (10GB)
- [ ] Google Drive free tier (15GB)
- [ ] Application Insights free tier (5GB/month)

### ✅ Ongoing Optimization
- [ ] Budget alerts set ($30/month threshold)
- [ ] Cost Management dashboard bookmarked
- [ ] Weekly cost review scheduled
- [ ] App Service stopped when not in use (B1+)
- [ ] Unused resources deleted promptly

### ✅ Monitoring Setup
- [ ] Cost monitor script runs weekly
- [ ] Resource usage alerts configured
- [ ] CPU/Memory thresholds set
- [ ] Auto-scaling disabled (to control costs)

---

## Testing Checklist

### ✅ API Endpoints
- [ ] `GET /health` returns 200
- [ ] `GET /` returns app info
- [ ] `POST /api/auth/register` creates user
- [ ] `POST /api/auth/login` returns JWT
- [ ] `GET /api/properties` lists properties
- [ ] `POST /api/properties` creates property (with auth)
- [ ] File upload endpoints work
- [ ] Email endpoints send emails

### ✅ Error Handling
- [ ] 404 errors handled
- [ ] 500 errors logged
- [ ] Validation errors return 400
- [ ] Auth errors return 401
- [ ] Rate limiting works (429)

---

## Production Readiness

### ✅ Before Going Live
- [ ] All tests passing
- [ ] Error handling tested
- [ ] Load testing completed (optional)
- [ ] Backup strategy in place
- [ ] Rollback plan documented
- [ ] Frontend connected and tested
- [ ] SSL certificate active (automatic)
- [ ] Custom domain configured (optional)

### ✅ Documentation
- [ ] API documentation updated (Postman/Swagger)
- [ ] Environment variables documented
- [ ] Deployment process documented
- [ ] Troubleshooting guide available
- [ ] Team members trained

---

## Monthly Maintenance

### ✅ Every Week
- [ ] Check cost dashboard
- [ ] Review application logs
- [ ] Test critical endpoints
- [ ] Monitor error rates

### ✅ Every Month
- [ ] Review security updates
- [ ] Update dependencies
- [ ] Review and delete old logs
- [ ] Check disk space usage
- [ ] Verify backup integrity

---

## Emergency Contacts & Resources

### 🆘 Support
- Azure Student Support: azureforedu@microsoft.com
- Azure Portal: https://portal.azure.com
- Cost Management: https://portal.azure.com/#view/Microsoft_Azure_CostManagement

### 📚 Documentation
- AZURE_DEPLOYMENT.md - Full deployment guide
- .env.example - Environment variables
- README.md - Project overview

### 🛠️ Quick Commands
```bash
# View logs
az webapp log tail --name <app-name> --resource-group findhouse-rg

# Restart app
az webapp restart --name <app-name> --resource-group findhouse-rg

# Stop app (save money)
az webapp stop --name <app-name> --resource-group findhouse-rg

# Check costs
./scripts/monitor-costs.sh
```

---

## Estimated Monthly Costs

### Development Setup (FREE)
- App Service F1: $0
- MongoDB Atlas M0: $0
- Cloudinary Free: $0
- GitHub Actions: $0
- **Total: $0/month** ✅

### Production Setup (Budget)
- App Service B1: $13
- MongoDB Atlas M0: $0
- Application Insights: $0 (free tier)
- **Total: $13/month** ✅

### Production Setup (Standard)
- App Service B1: $13
- MongoDB Atlas M10: $57
- **Total: $70/month**

---

**Last Updated:** {{ date }}
**Status:** {{ status }}
**Deployed URL:** {{ app_url }}
