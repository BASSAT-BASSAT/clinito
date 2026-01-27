# Deploy Convex Functions - Step by Step Guide

## ✅ What I've Done

1. ✅ Added `getAllPatients` function (already existed)
2. ✅ Added your new functions: `addPatient`, `listPatients`, `addMedicalHistory`, `listHistory`
3. ✅ Added `medical_history` table to schema
4. ✅ Updated `.env.local` with CONVEX_URL
5. ✅ Created test script (`test-convex.mjs`)
6. ✅ Verified connection to Convex server works

## ⚠️ Current Status

**The Convex server is reachable, but functions are NOT deployed yet.**

The error "Could not find public function" means your functions exist in the code but haven't been pushed to the Convex backend.

## 🚀 How to Deploy (Choose One Method)

### Method 1: Development Mode (Recommended for Development)

This keeps functions in sync as you code:

1. **Open a terminal** in your project:
   ```powershell
   cd "D:\clineto\New folder\clinito"
   ```

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
   ✓ Deployed function patients:listPatients
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
node test-convex.mjs
```

You should see:
```
✅ getAllPatients works! Found X patients
✅ listPatients works! Found X patients
✅ Convex is working correctly!
```

## 📝 Available Functions

After deployment, these functions will be available:

### Queries (Read):
- `patients:getAllPatients` - Get all patients (existing)
- `patients:listPatients` - Get all patients (new)
- `patients:listHistory` - Get all medical history (new)
- `patients:getPatient` - Get patient by ID
- `patients:searchPatients` - Search patients
- `patients:getPatientPortfolio` - Get full patient portfolio

### Mutations (Write):
- `patients:createPatient` - Create patient (existing)
- `patients:addPatient` - Add patient (new, simpler)
- `patients:addMedicalHistory` - Add medical history (new)
- `patients:updatePatient` - Update patient

## 🔍 Troubleshooting

### "No CONVEX_DEPLOYMENT set"
- Run `npx convex dev` first to configure the project

### "Authentication required"
- Run `npx convex login` first

### "Functions still not found"
- Make sure `npx convex dev` is still running
- Or run `npx convex deploy` again

### Connection works but functions missing
- Functions are deployed but schema might be different
- Check that schema matches what's deployed

## 📦 Seed Data (Optional)

After deployment, you can seed test data:

```powershell
node seed.mjs
```

View the data:

```powershell
node show.mjs
```
