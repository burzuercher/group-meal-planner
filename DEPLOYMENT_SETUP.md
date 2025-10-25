# Firebase Functions v2 Deployment Setup

If you encounter deployment errors, follow these steps to enable required Google Cloud services.

## Quick Fix: Enable Required APIs

Run these commands to enable the necessary Google Cloud APIs:

```bash
# Enable Cloud Functions API
gcloud services enable cloudfunctions.googleapis.com --project=lifegroup-menu-planner

# Enable Cloud Build API (required for v2)
gcloud services enable cloudbuild.googleapis.com --project=lifegroup-menu-planner

# Enable Artifact Registry API
gcloud services enable artifactregistry.googleapis.com --project=lifegroup-menu-planner

# Enable Cloud Run API (v2 functions use Cloud Run)
gcloud services enable run.googleapis.com --project=lifegroup-menu-planner

# Enable Secret Manager (optional, for secure API keys)
gcloud services enable secretmanager.googleapis.com --project=lifegroup-menu-planner
```

## Alternative: Use Firebase Console

If you don't have `gcloud` CLI installed:

1. **Visit Firebase Console**: https://console.firebase.google.com/project/lifegroup-menu-planner/functions

2. **Click "Get Started"** - This will automatically enable the required APIs

3. **Enable Cloud Build**:
   - Go to: https://console.cloud.google.com/cloud-build/builds?project=lifegroup-menu-planner
   - Click "Enable Cloud Build API"

4. **Initialize App Engine** (if prompted):
   - Go to: https://console.cloud.google.com/appengine?project=lifegroup-menu-planner
   - Click "Create Application"
   - Select region: `us-central` (must match your function region)

## After Enabling APIs

Wait 1-2 minutes for the services to propagate, then retry deployment:

```bash
firebase deploy --only functions
```

## If Issues Persist

### Option 1: Upgrade Firebase Billing Plan

Firebase Functions v2 requires the Blaze (pay-as-you-go) plan:
- Visit: https://console.firebase.google.com/project/lifegroup-menu-planner/usage/details
- Upgrade to Blaze plan (has generous free tier)

### Option 2: Use Functions v1 (Legacy)

If you prefer to stick with the free plan, we can downgrade to Functions v1.

Let me know which option you prefer!
