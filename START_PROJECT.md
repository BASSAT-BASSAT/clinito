# How to Start the Project

## ⚠️ Two Issues Fixed + Setup Instructions

### Issue 1: Convex Error (FIXED in code, but needs deployment)
**Problem**: `Could not find public function for 'patients:getAllPatients'`

**Solution**: 
1. The code now handles this error gracefully (won't crash)
2. **BUT** you still need to deploy Convex functions:

```powershell
# In a NEW terminal window:
cd "D:\clineto\New folder\clinito"
npx convex dev
```

This will:
- Authenticate you with Convex
- Deploy all functions
- Keep them synced

**Keep this terminal open while developing!**

### Issue 2: Highlighting Not Working (FIXED error handling)
**Problem**: Highlighting doesn't work when clicking buttons

**Solution**: The SAM3 server needs to be running. Start it:

```powershell
# In a NEW terminal window:
cd "D:\clineto\New folder\clinito\sam3-server"
python main.py
```

Or if that doesn't work:
```powershell
cd "D:\clineto\New folder\clinito"
python sam3-server/main.py
```

**Keep this terminal open!** The server runs on `http://localhost:8000`

## 🚀 Complete Startup Process

You need **3 terminal windows**:

### Terminal 1: Next.js Frontend
```powershell
cd "D:\clineto\New folder\clinito"
npm run dev
```
Runs on: http://localhost:3000

### Terminal 2: Convex Backend
```powershell
cd "D:\clineto\New folder\clinito"
npx convex dev
```
Deploys and syncs Convex functions

### Terminal 3: SAM3 Server (for highlighting)
```powershell
cd "D:\clineto\New folder\clinito\sam3-server"
python main.py
```
Runs on: http://localhost:8000

## ✅ What I Fixed

1. **Patients Page**: Now handles Convex errors gracefully - shows loading state instead of crashing
2. **Highlighting**: Better error messages when SAM3 server isn't running
3. **API Route**: Improved error handling and response format compatibility
4. **User Feedback**: Clear messages about what's missing

## 🧪 Test After Starting All Services

1. **Test Patients Page**: http://localhost:3000/patients
   - Should load without errors (even if no patients yet)
   - If you see "Loading patients..." forever, Convex isn't deployed

2. **Test Highlighting**: http://localhost:3000/?tab=analyze
   - Upload an image
   - Click a quick analysis button (fracture, tumor, etc.)
   - Should show highlighted mask
   - If error, check Terminal 3 (SAM3 server)

## 🔍 Troubleshooting

### "Could not find public function"
- Run `npx convex dev` in Terminal 2
- Wait for "Deployed function..." messages
- Refresh browser

### "Failed to connect to SAM3 server"
- Run `python sam3-server/main.py` in Terminal 3
- Check it says "Server running on http://localhost:8000"
- Make sure port 8000 isn't used by another app

### Highlighting shows nothing
- Check browser console (F12) for errors
- Check Terminal 3 for SAM3 server errors
- Try a different image
- Check that mask_url is in the response

## 📝 Notes

- Convex dev server must stay running to sync functions
- SAM3 server must stay running for highlighting to work
- Next.js dev server auto-reloads on code changes
- All three can run simultaneously
