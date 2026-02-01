import { ConvexClient } from "convex/browser";
import dotenv from "dotenv";

dotenv.config();

const client = new ConvexClient(process.env.CONVEX_URL);

async function main() {
  console.log("📋 Patients:");
  const patients = await client.query("patients:listPatients", {});
  console.log(patients);

  console.log("\n📋 Medical History:");
  const history = await client.query("patients:listHistory", {});
  console.log(history);
}

main().catch(console.error);
