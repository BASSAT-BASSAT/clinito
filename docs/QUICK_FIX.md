# Quick Fix Guide

## The Problems & Solutions

### Problem 1: Convex Error on /patients page
**Error**: `Could not find public function for 'patients:getAllPatients'`

**Solution**:
1. Open a NEW terminal
2. Run: `npx convex dev`
3. Wait for it to deploy functions
4. Refresh the page

### Problem 2: Highlighting Doesn't Work
**Issue**: Clicking highlight buttons does nothing

**Solution**:
1. Open a NEW terminal
2. Run: `cd sam3-server && python main.py`
3. Wait for "Server running on http://localhost:8000"
4. Try highlighting again

**OR** - Use DEMO MODE that works without the server (shows a simple highlight)

## 🚀 Easiest Way: Use the Startup Script

Run from project root:

```powershell
.\start-all.ps1
```

This will open 3 terminal windows automatically:
- Next.js (port 3000)
- Convex (deploying functions)
- SAM3 (port 8000)

## Manual Start (3 Terminals Needed)

### Terminal 1: Next.js
```powershell
npm run dev
```

### Terminal 2: Convex
```powershell
npx convex dev
```

### Terminal 3: SAM3 Server
```powershell
cd sam3-server
python main.py
```

## ✅ What I Fixed

1. **Patients Page**: Now shows a helpful error message instead of crashing
2. **Highlighting**: Added DEMO MODE fallback - works even without SAM3 server
3. **Error Messages**: Clear instructions on what's missing
