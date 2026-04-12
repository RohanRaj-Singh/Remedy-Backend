const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config(); // Load environment variables from .env

// 👉 Connect to the exact database URL from your .env
const DB_URL = process.env.DB_URL || "mongodb://127.0.0.1:27017/oqep";

// Minimal schemas using strict: false so we don't need the full TS definitions
const organizationSchema = new mongoose.Schema({
  name: String,
  username: String,
  password: { type: String, select: false }
}, { strict: false });

const questionSchema = new mongoose.Schema({
  text: String,
  dashboardDomain: String,
  domain: String,
  weight: Number,
  isFollowUp: Boolean,
  isInverted: Boolean,
  id: String
}, { strict: false });

// Models matching the expected references in your backend
const Organization = mongoose.model("Organization", organizationSchema, "organizations");
const Question = mongoose.model("Question", questionSchema, "questions");

// 👉 IMPORT YOUR ACTUAL BACKEND DATA HERE
// Replace these empty arrays by requiring the file(s) where they are hardcoded.
// For example: 
// const hardcodedOrganizations = require("./data/organizations.json");
// const hardcodedQuestions = require("../../constants/questions.js").questions;
// const hardcodedOrganizations = []; 
const hardcodedQuestions = require("../../../../question.json");

async function seed() {
  // 🚨 PRODUCTION SAFEGUARD: Prevent accidental execution on the live VPS
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true") {
    console.error("❌ DANGER: Seeding in production is disabled to protect live data.");
    console.error("👉 If you absolutely MUST seed production, run: ALLOW_PROD_SEED=true node seed.js");
    process.exit(1);
  }

  try {
    await mongoose.connect(DB_URL);
    console.log(`✅ Connected to MongoDB at: ${DB_URL}`);

    // 1. Clear existing documents to prevent duplicates on multiple runs
    await Organization.deleteMany({});
    await Question.deleteMany({});
    console.log("🧹 Cleared existing Organizations and Questions.");

    // 2. Create the specific OQEP admin Organization
    const hashedPassword = await bcrypt.hash("123456", 12);
    const hardcodedId = "6902bda0c0f78f02d2067668";
    const org = await Organization.create({
      _id: new mongoose.Types.ObjectId(hardcodedId),
      organizationId: hardcodedId,
      name: "OQEP Admin",
      username: "OQEP",
      password: hashedPassword,
      isDelete: false,
    });
    console.log(`🏢 Created Admin User -> Username: ${org.username} | Password: 123456`);

    // 3. Insert actual Survey Questions from question.json
    if (hardcodedQuestions.length > 0) {
      await Question.insertMany(hardcodedQuestions);
      console.log(`📝 Inserted ${hardcodedQuestions.length} actual questions into the database.`);
    } else {
      console.log("⚠️ No hardcoded questions found to insert. (Please update the import at the top of the file)");
    }

    console.log("\n🎉 --- SEEDING COMPLETE ---");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  }
}

seed();