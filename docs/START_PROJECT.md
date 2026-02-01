# How to Start the Project

## Two Issues Fixed + Setup Instructions

### Issue 1: Convex Error (FIXED in code, but needs deployment)
**Problem**: `Could not find public function for 'patients:getAllPatients'`

**Solution**:
1. The code now handles this error gracefully (won't crash)
2. **BUT** you still need to deploy Convex functions:

```powershell
# In a NEW terminal window (from project root):
npx convex dev
```

This will authenticate with Convex, deploy all functions, and keep them synced. **Keep this terminal open while developing!**

### Issue 2: Highlighting Not Working (FIXED error handling)
**Problem**: Highlighting doesn't work when clicking buttons

**Solution**: The SAM3 server needs to be running. Start it:

```powershell
# In a NEW terminal window:
cd sam3-server
python main.py
```

Or from project root: `python sam3-server/main.py`. **Keep this terminal open!** The server runs on `http://localhost:8000`.

## 🚀 Complete Startup Process

You need **3 terminal windows** (from project root):

### Terminal 1: Next.js Frontend
```powershell
npm run dev
```
Runs on: http://localhost:3000

### Terminal 2: Convex Backend
```powershell
npx convex dev
```
Deploys and syncs Convex functions

### Terminal 3: SAM3 Server (for highlighting)
```powershell
cd sam3-server
python main.py
```
Runs on: http://localhost:8000

## 🧪 Test After Starting All Services

1. **Test Patients Page**: http://localhost:3000/patients
   - Should load without errors (even if no patients yet)
   - If you see "Loading patients..." forever, Convex isn't deployed

2. **Test Highlighting**: http://localhost:3000/app (Workstation)
   - Upload an image
   - Click a quick analysis button (fracture, tumor, etc.)
   - Should show highlighted mask
   - If error, check Terminal 3 (SAM3 server)

## 🔍 Troubleshooting

- **"Could not find public function"**: Run `npx convex dev` in Terminal 2; wait for "Deployed function..." messages; refresh browser
- **"Failed to connect to SAM3 server"**: Run `python sam3-server/main.py` in Terminal 3; check port 8000 is free
- **Highlighting shows nothing**: Check browser console (F12) and SAM3 terminal; try a different image

## 📝 Notes

- Convex dev server must stay running to sync functions
- SAM3 server must stay running for highlighting to work
- Next.js dev server auto-reloads on code changes
- All three can run simultaneously
