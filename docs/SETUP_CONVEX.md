# Convex Setup Instructions

## The Problem
Your Convex functions exist in the code but haven't been deployed to the Convex backend. The error "Could not find public function for 'patients:getAllPatients'" means the backend doesn't know about your functions yet.

## Solution: Run Convex Dev Server

You need to run `npx convex dev` in a terminal. This will:
1. Authenticate you with Convex (if needed)
2. Link your project to a Convex deployment
3. Deploy your functions
4. Keep them in sync as you develop

## Steps:

1. **Open a new terminal** in your project root.

2. **Run the Convex dev command:**
   ```
   npx convex dev
   ```

3. **Follow the prompts:**
   - If you're not logged in, it will open a browser for authentication
   - It will ask if you want to create a new project or use an existing one
   - If you have an existing Convex project, select it
   - If not, create a new one

4. **Wait for deployment:**
   - Convex will deploy all your functions from the `convex/` folder
   - You'll see messages like "Deployed function patients:getAllPatients"
   - The dev server will keep running and watch for changes

5. **Keep the terminal open:**
   - The `npx convex dev` process needs to stay running
   - It syncs your functions in real-time as you make changes

## Alternative: Deploy to Production

If you want to deploy to the production URL instead:

1. First, you need to be authenticated and have the project linked
2. Then run:
   ```
   npx convex deploy
   ```

## After Setup

Once Convex is running, your Next.js app at `http://localhost:3000` should be able to call the functions without errors.

## Troubleshooting

- **"No CONVEX_DEPLOYMENT set"**: You need to run `npx convex dev` first to configure the project
- **Authentication errors**: Make sure you're logged into Convex (it will prompt you)
- **Functions still not found**: Make sure `npx convex dev` is still running in a terminal
