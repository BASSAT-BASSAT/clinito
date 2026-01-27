import { ConvexClient } from "convex/browser";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ CONVEX_URL not found in .env.local");
  process.exit(1);
}

console.log("🔗 Testing Convex connection to:", CONVEX_URL);

const client = new ConvexClient(CONVEX_URL);

async function testConnection() {
  try {
    console.log("\n📋 Testing getAllPatients query...");
    const patients = await client.query("patients:getAllPatients", {});
    console.log("✅ getAllPatients works! Found", patients?.length || 0, "patients");
    
    console.log("\n📋 Testing listPatients query...");
    const allPatients = await client.query("patients:listPatients", {});
    console.log("✅ listPatients works! Found", allPatients?.length || 0, "patients");
    
    console.log("\n✅ Convex is working correctly!");
    return true;
  } catch (error) {
    console.error("\n❌ Error testing Convex:", error.message);
    if (error.message.includes("Could not find public function")) {
      console.error("\n⚠️  Functions are not deployed yet. You need to run:");
      console.error("   npx convex dev");
      console.error("\n   Or deploy to production:");
      console.error("   npx convex deploy");
    }
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
