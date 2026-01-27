import { ConvexClient } from "convex/browser";
import dotenv from "dotenv";

dotenv.config();

const client = new ConvexClient(process.env.CONVEX_URL);

async function main() {
  console.log("🌱 Seeding database...");

  const patientId = await client.mutation("patients:addPatient", {
    name: "Omar Mahmoud",
    email: "omarmahmoudahmed2222005@gmail.com",
    phone: "01060842338",
  });

  console.log("Added patient:", patientId);

  const historyId = await client.mutation("patients:addMedicalHistory", {
    patient_id: patientId,
    description: "Chest pain and short breath.",
    images: ["https://example.com/xray1.jpg"],
  });

  console.log("Added medical history:", historyId);
}

main().catch(console.error);
