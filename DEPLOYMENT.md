# Coolify Deployment Guide

## Prerequisites

- Coolify instance set up and running
- MongoDB database (can be self-hosted or use MongoDB Atlas)
- Inngest account (for background jobs)

## Step 1: Prepare Your Repository

1. Make sure your code is pushed to a Git repository (GitHub, GitLab, etc.)
2. The Dockerfile and .dockerignore are already created

## Step 2: Create Application in Coolify

1. **Login to Coolify** and navigate to your project
2. **Click "New Resource"** → **"Application"**
3. **Select "Docker Compose"** or **"Dockerfile"** (if available)

## Step 3: Configure Application

### Build Settings:

- **Build Pack**: Dockerfile
- **Dockerfile Location**: `./Dockerfile`
- **Build Context**: `./`
- **Port**: `5000` (or use the PORT environment variable)

### Git Repository:

- **Repository URL**: Your Git repository URL
- **Branch**: `main` or `master`
- **Build Command**: (Leave empty, Dockerfile handles it)

## Step 4: Environment Variables

Add these environment variables in Coolify:

### Required:

```
PORT=5000
MONGO_URI=mongodb://your-mongodb-connection-string
FRONTEND_URL=https://your-frontend-domain.com
```

### JWT (if using):

```
JWT_SECRET=your-secret-key-here
```

### Inngest (if using):

```
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key
```

### Email (if using nodemailer):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### AI/OpenAI (if using):

```
OPENAI_API_KEY=your-openai-api-key
```

## Step 5: Database Setup

### Option A: MongoDB Atlas (Recommended)

1. Create a MongoDB Atlas account
2. Create a cluster
3. Get connection string
4. Add to `MONGO_URI` environment variable

### Option B: Self-hosted MongoDB in Coolify

1. Create a new MongoDB service in Coolify
2. Use the internal connection string

## Step 6: Inngest Setup

1. **Inngest Cloud** (Recommended):

   - Sign up at https://inngest.com
   - Get your keys from dashboard
   - Add to environment variables

2. **Self-hosted Inngest** (Advanced):
   - Deploy Inngest separately
   - Update Inngest client configuration

## Step 7: Deploy

1. Click **"Deploy"** in Coolify
2. Monitor the build logs
3. Once deployed, your API will be available at the provided domain

## Step 8: Configure Domain & SSL

1. Add your custom domain in Coolify
2. SSL certificate will be automatically provisioned via Let's Encrypt

## Step 9: Update Frontend

Update your frontend's `.env` file:

```
VITE_SERVER_URL=https://your-api-domain.com
```

## Troubleshooting

### Build Fails:

- Check Dockerfile syntax
- Verify all files are in repository
- Check build logs in Coolify

### Application Crashes:

- Check application logs in Coolify
- Verify all environment variables are set
- Check MongoDB connection

### CORS Issues:

- Verify `FRONTEND_URL` matches your frontend domain exactly
- Check CORS configuration in `index.js`

## Notes

- The application uses `nodemon` in dev but `node` in production (via Dockerfile)
- Make sure MongoDB is accessible from your Coolify server
- Inngest webhook endpoint: `/api/inngest` (configure in Inngest dashboard)
