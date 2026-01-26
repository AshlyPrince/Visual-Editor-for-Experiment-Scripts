# Deploy Keycloak on Railway

## Quick Start

### 1. Sign Up for Railway
- Go to https://railway.app/
- Click "Login with GitHub"
- Authorize Railway to access your GitHub account

### 2. Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository: `Visual-Editor-for-Experiment-Scripts`
4. Railway will detect your project

### 3. Add Keycloak Service

#### Option A: Via Railway Dashboard (Recommended)

1. In your Railway project, click "+ New"
2. Select "GitHub Repo"
3. Choose your repository again
4. Railway will create a new service

5. **Configure the service:**
   - Click on the service
   - Go to "Settings"
   - Under "Build":
     - Root Directory: Leave empty (uses repo root)
     - Dockerfile Path: `Dockerfile.keycloak`
   
6. **Set Environment Variables:**
   Click "Variables" tab and add:
   ```
   KEYCLOAK_ADMIN=admin
   KEYCLOAK_ADMIN_PASSWORD=<generate-strong-password>
   KC_HEALTH_ENABLED=true
   KC_HTTP_ENABLED=true
   KC_HOSTNAME_STRICT=false
   KC_PROXY=edge
   KC_DB=dev-file
   PORT=8080
   ```

7. **Deploy:**
   - Railway will automatically deploy
   - Wait for deployment to complete (2-5 minutes)
   - Get your public URL from the "Settings" → "Networking" section

#### Option B: Via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project (or create new)
railway link

# Create a new service for Keycloak
railway up --service keycloak

# Set environment variables
railway variables set KEYCLOAK_ADMIN=admin
railway variables set KEYCLOAK_ADMIN_PASSWORD=your-secure-password
railway variables set KC_HEALTH_ENABLED=true
railway variables set KC_HTTP_ENABLED=true
railway variables set KC_HOSTNAME_STRICT=false
railway variables set KC_PROXY=edge
railway variables set KC_DB=dev-file

# Deploy
railway up
```

### 4. Get Your Keycloak URL

After deployment:
1. Go to your Keycloak service in Railway dashboard
2. Click "Settings" → "Networking"
3. Click "Generate Domain" if not already generated
4. Your URL will be something like: `https://keycloak-production-xxxx.up.railway.app`

### 5. Configure Keycloak

1. Visit your Keycloak URL: `https://your-keycloak-url.railway.app/admin`
2. Login with:
   - Username: `admin`
   - Password: (the one you set in environment variables)

3. Verify the realm `myrealm` was imported

4. Get the public key:
   - Go to "Realm Settings" → "Keys"
   - Find the RSA key
   - Click "Public key" button
   - Copy the public key value

### 6. Update Your Backend on Render

Go to your `visual-editor-backend` service on Render and update these environment variables:

```
PROTECT_ROUTES=keycloak
KC_REALM=myrealm
KC_AUTH_SERVER_URL=https://your-keycloak-url.railway.app/
KC_CLIENT_ID=admin-backend
KC_REALM_PUBLIC_KEY=<paste-the-public-key-here>
```

Save and your backend will redeploy.

### 7. Update Frontend Configuration

Update your frontend to use:
- Keycloak URL: `https://your-keycloak-url.railway.app`
- Realm: `myrealm`
- Client ID: `admin-backend`

### 8. Configure Keycloak Client

In Keycloak admin console:

1. Go to "Clients" → "admin-backend"
2. Set these values:
   - **Valid Redirect URIs**: 
     - `https://visual-editor-frontend.onrender.com/*`
     - `http://localhost:5173/*`
   - **Web Origins**: 
     - `https://visual-editor-frontend.onrender.com`
     - `https://visual-editor-backend.onrender.com`
     - `http://localhost:5173`
   - **Access Type**: `public`
3. Click "Save"

### 9. Create Users

1. Go to "Users" → "Add user"
2. Fill in details:
   - Username: `testuser`
   - Email: `test@example.com`
3. Click "Save"
4. Go to "Credentials" tab
5. Set password and disable "Temporary"
6. Assign roles if needed

## Testing

1. Visit your frontend: `https://visual-editor-frontend.onrender.com`
2. You should see a login button
3. Click login → redirected to Keycloak
4. Enter credentials
5. Redirected back to your app

## Troubleshooting

### Deployment Fails
- Check Railway logs in the deployment tab
- Verify Dockerfile.keycloak exists
- Check environment variables are set

### Can't Access Keycloak
- Ensure public networking is enabled
- Check if domain is generated
- Wait a few minutes after deployment

### Login Doesn't Work
- Verify all redirect URIs are correct
- Check CORS settings in Keycloak
- Verify backend has correct public key

## Railway Benefits

✅ Better Docker support than Render
✅ $5/month free credit
✅ Automatic HTTPS
✅ Easy environment variables
✅ Good logging and monitoring
✅ Fast deployments

## Cost

- Railway free tier: $5 credit/month
- Keycloak service: ~$2-3/month
- Should stay within free tier for development

## Alternative: Use Simpler Dockerfile

If the build process fails, use this simpler version in `Dockerfile.keycloak`:

```dockerfile
FROM quay.io/keycloak/keycloak:26.0.7

COPY keycloak/myrealm-import.json /opt/keycloak/data/import/

ENV KC_HEALTH_ENABLED=true
ENV KC_HTTP_ENABLED=true
ENV KC_HOSTNAME_STRICT=false
ENV KC_PROXY=edge
ENV KC_DB=dev-file

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start-dev", "--import-realm"]
```

Then redeploy on Railway.
