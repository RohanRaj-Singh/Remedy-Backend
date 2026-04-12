const mongoose = require("mongoose");

// Your local MongoDB connection string (pointing to the oqep database)
const DB_URL = "mongodb://127.0.0.1:27017/oqep";

// Minimal schemas using strict: false so we don't need the full TS definitions
const organizationSchema = new mongoose.Schema({
  name: String,
}, { strict: false });

const questionSchema = new mongoose.Schema({
  text: String,
  dashboardDomain: String,
  domain: String,
  weight: Number,
  isFollowUp: Boolean,
  isInverted: Boolean,
  id: Number
}, { strict: false });

// Models matching the expected references in your backend
const Organization = mongoose.model("Organization", organizationSchema);
const Question = mongoose.model("Question", questionSchema, "questions");

// 👉 IMPORT YOUR ACTUAL BACKEND DATA HERE
// Replace these empty arrays by requiring the file(s) where they are hardcoded.
// For example: 
// const hardcodedOrganizations = require("./data/organizations.json");
// const hardcodedQuestions = require("../../constants/questions.js").questions;
const hardcodedOrganizations = []; 
const hardcodedQuestions = [];

async function seed() {
  try {
    await mongoose.connect(DB_URL);
    console.log("✅ Connected to MongoDB locally.");

    // 1. Clear existing documents to prevent duplicates on multiple runs
    await Organization.deleteMany({});
    await Question.deleteMany({});
    console.log("🧹 Cleared existing Organizations and Questions.");

    // 2. Create an Organization with a hardcoded ID
    // Check your frontend API call payload for the exact 24-character ID being sent
    // and replace the string below so the database matches your frontend exactly.
    const hardcodedId = "6902bda0c0f78f02d2067668"; // <-- REPLACE THIS WITH YOUR FRONTEND'S ID
    const org = await Organization.create({
      _id: new mongoose.Types.ObjectId(hardcodedId),
      id: hardcodedId, // Fallback in case the backend queries by string 'id'
      organizationId: hardcodedId, // Fallback in case the backend queries by 'organizationId'
      name: "RemedyGCC OQEP Test Organization",
    });
    console.log(`🏢 Created Organization: ${org.name}`);
    // 2. Insert all hardcoded Organizations from the backend
    if (hardcodedOrganizations.length > 0) {
      await Organization.insertMany(hardcodedOrganizations);
      console.log(`🏢 Inserted ${hardcodedOrganizations.length} actual organizations.`);
    } else {
      console.log("⚠️ No hardcoded organizations found to insert. (Please update the import at the top of the file)");
    }

    // 3. Create Survey Questions based on the required DASHBOARD_DOMAINS
    const DASHBOARD_DOMAINS = [
      "Clinical Risk Index",
      "Psychological Safety Index",
      "Workload & Efficiency",
      "Leadership & Alignment",
      "Satisfaction & Engagement",
    ];

    const questionsToInsert = [];
    let qId = 1;

    for (const domain of DASHBOARD_DOMAINS) {
      // Add a main question
      questionsToInsert.push({
        text: `Sample main question evaluating ${domain}?`,
        dashboardDomain: domain,
        domain: domain,
        weight: 1,
        isFollowUp: false,
        isInverted: false,
        id: qId++
      });
    // 3. Insert all hardcoded Survey Questions from the backend
    if (hardcodedQuestions.length > 0) {
      await Question.insertMany(hardcodedQuestions);
      console.log(`📝 Inserted ${hardcodedQuestions.length} actual questions into the database.`);
    } else {
      console.log("⚠️ No hardcoded questions found to insert. (Please update the import at the top of the file)");
    }

    await Question.insertMany(questionsToInsert);
    console.log(`📝 Inserted ${questionsToInsert.length} questions into the database.`);

    console.log("\n🎉 --- SEEDING COMPLETE ---");
    console.log(`👉 Use this Organization ID for testing: ${org._id.toString()}`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  }
}

seed();