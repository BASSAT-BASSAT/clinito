# Deploy Convex Functions - Step by Step Guide

## ✅ What I've Done

1. ✅ Added `getAllPatients` function (already existed)
2. ✅ Added your new functions: `addPatient`, `listPatients`, `addMedicalHistory`, `listHistory`
3. ✅ Added `medical_history` table to schema
4. ✅ Updated `.env.local` with CONVEX_URL
5. ✅ Created test script (`scripts/test-convex.mjs`)
6. ✅ Verified connection to Convex server works

## ⚠️ Current Status

**The Convex server is reachable, but functions are NOT deployed yet.**

The error "Could not find public function" means your functions exist in the code but haven't been pushed to the Convex backend.

## 🚀 How to Deploy (Choose One Method)

### Method 1: Development Mode (Recommended for Development)

This keeps functions in sync as you code:

1. **Open a terminal** in your project root.

2. **Run:**
   ```powershell
   npx convex dev
   ```

3. **Follow the prompts:**
   - If not logged in, it will open browser for authentication
   - Choose to use existing project or create new
   - Wait for deployment to complete
   - **Keep this terminal open** - it watches for changes

4. **You should see:**
   ```
   ✓ Deployed function patients:getAllPatients
   ✓ Deployed function patients:addPatient
   ... etc
   ```

### Method 2: Production Deploy (One-time)

If you want to deploy once to production:

1. **First, authenticate** (if not already):
   ```powershell
   npx convex login
   ```

2. **Then deploy:**
   ```powershell
   npx convex deploy
   ```

## 🧪 Test After Deployment

After deploying, test the connection:

```powershell
node scripts/test-convex.mjs
```

You should see:
```
✅ getAllPatients works! Found X patients
✅ Convex is working correctly!
```

## 📦 Seed Data (Optional)

After deployment, you can seed test data:

```powershell
node scripts/seed.mjs
```

View the data:

```powershell
node scripts/show.mjs
```

## 🔍 Troubleshooting

- **"No CONVEX_DEPLOYMENT set"**: Run `npx convex dev` first to configure the project
- **"Authentication required"**: Run `npx convex login` first
- **Functions still not found**: Keep `npx convex dev` running or run `npx convex deploy` again
