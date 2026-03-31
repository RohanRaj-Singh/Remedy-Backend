require("dotenv/config");
const mongoose = require("mongoose");

const EmployeeInvite = mongoose.model("employee_invites", new mongoose.Schema({}, { strict: false }));
const SurveyRef = mongoose.model("survey_references", new mongoose.Schema({}, { strict: false }));

const ORG_ID = "6902bda0c0f78f02d2067668";

(async () => {
  await mongoose.connect(process.env.DB_URL);
  console.log("Connected to MongoDB\n");

  // Delete all employee invites for this org
  const inviteResult = await EmployeeInvite.deleteMany({
    organizationId: new mongoose.Types.ObjectId(ORG_ID),
  });
  console.log("Deleted employee_invites:", inviteResult.deletedCount);

  // Delete all survey references for this org
  const refResult = await SurveyRef.deleteMany({
    organizationId: new mongoose.Types.ObjectId(ORG_ID),
  });
  console.log("Deleted survey_references:", refResult.deletedCount);

  await mongoose.disconnect();
  console.log("\nDone.");
})();
