const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

//
// 👉 Connects to your online production database
const DB_URL = process.env.DB_URL || "mongodb+srv://turki_db_user:0udKEB4onEuGPQ09@cluster0.svoc3yp.mongodb.net/Remedy";

// Minimal schemas using strict: false to grab everything without defining the exact shape
const organizationSchema = new mongoose.Schema({}, { strict: false, collection: "organizations" });
const questionSchema = new mongoose.Schema({}, { strict: false, collection: "questions" });

const Organization = mongoose.model("Organization", organizationSchema);
const Question = mongoose.model("Question", questionSchema);

async function exportData() {
  try {
    console.log(`Connecting to database...`);
    await mongoose.connect(DB_URL);
    console.log("✅ Connected successfully.");

    // Fetch all data and use .lean() to get plain JavaScript objects
    const orgs = await Organization.find({}).lean();
    const questions = await Question.find({}).lean();

    // Write data to JSON files
    const orgsPath = path.join(__dirname, "organizations.json");
    const questionsPath = path.join(__dirname, "questions.json");

    fs.writeFileSync(orgsPath, JSON.stringify(orgs, null, 2));
    console.log(`📁 Exported ${orgs.length} organizations to ${orgsPath}`);

    fs.writeFileSync(questionsPath, JSON.stringify(questions, null, 2));
    console.log(`📁 Exported ${questions.length} questions to ${questionsPath}`);

    console.log("\n🎉 Export complete! You can now download these JSON files.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error exporting data:", error);
    process.exit(1);
  }
}

exportData();