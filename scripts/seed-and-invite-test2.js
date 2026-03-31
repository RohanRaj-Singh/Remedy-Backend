require("dotenv/config");
const mongoose = require("mongoose");
const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");

const TEST_EMAIL = "internationaltijarat.com@gmail.com";
const ORG_ID = "6902bda0c0f78f02d2067668";

const EMPLOYEE = {
  stream: "People_Technology_And_Culture",
  function: "IDS_And_CI",
  department: "IDS_And_CI",
  location: "headOffice",
  age: "35-44",
  gender: "male",
};

const refSchema = new mongoose.Schema({
  organizationId: mongoose.Schema.Types.ObjectId,
  kind: String,
  name: String,
  normalizedName: String,
});
const SurveyRef = mongoose.model("survey_references", refSchema);

const inviteSchema = new mongoose.Schema({
  organizationId: mongoose.Schema.Types.ObjectId,
  email: String,
  streamRef: mongoose.Schema.Types.ObjectId,
  functionRef: mongoose.Schema.Types.ObjectId,
  departmentRef: mongoose.Schema.Types.ObjectId,
  locationRef: mongoose.Schema.Types.ObjectId,
  stream: String,
  function: String,
  department: String,
  location: String,
  age: String,
  gender: String,
  tokenHash: String,
  tokenExpiresAt: Date,
  emailSent: Boolean,
  emailSentAt: Date,
  completed: Boolean,
});
const EmployeeInvite = mongoose.model("employee_invites", inviteSchema);

const getOrCreate = async (kind, name) => {
  const normalized = name.trim().toLowerCase();
  let ref = await SurveyRef.findOne({ organizationId: ORG_ID, kind, normalizedName: normalized });
  if (!ref) {
    ref = await SurveyRef.create({
      organizationId: new mongoose.Types.ObjectId(ORG_ID),
      kind,
      name,
      normalizedName: normalized,
    });
    console.log(`  Created ${kind} ref: "${name}"`);
  } else {
    console.log(`  Found existing ${kind} ref: "${name}"`);
  }
  return ref;
};

(async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("✅ Connected to MongoDB\n");

    // 1. Upsert references
    const streamRef    = await getOrCreate("stream",     EMPLOYEE.stream);
    const functionRef  = await getOrCreate("function",   EMPLOYEE.function);
    const departmentRef= await getOrCreate("department", EMPLOYEE.department);
    const locationRef  = await getOrCreate("location",   EMPLOYEE.location);

    // 2. Generate token
    const raw  = crypto.randomBytes(32).toString("hex");
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 3. Upsert invite record
    await EmployeeInvite.updateOne(
      { organizationId: new mongoose.Types.ObjectId(ORG_ID), email: TEST_EMAIL },
      {
        $set: {
          organizationId: new mongoose.Types.ObjectId(ORG_ID),
          email:          TEST_EMAIL,
          streamRef:      streamRef._id,
          functionRef:    functionRef._id,
          departmentRef:  departmentRef._id,
          locationRef:    locationRef._id,
          stream:         EMPLOYEE.stream,
          function:       EMPLOYEE.function,
          department:     EMPLOYEE.department,
          location:       EMPLOYEE.location,
          age:            EMPLOYEE.age,
          gender:         EMPLOYEE.gender,
          tokenHash:      hash,
          tokenExpiresAt: expiresAt,
          emailSent:      false,
          completed:      false,
        },
      },
      { upsert: true }
    );
    console.log("\n✅ Invite record upserted in DB");

    // 4. Send email
    const baseUrl    = process.env.SCANNER_BASE_URL || "https://oqep.remedygcc.com/survey";
    const surveyLink = `${baseUrl}?token=${raw}`;

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMail.send({
      to:      TEST_EMAIL,
      from:    process.env.EMAIL_FROM,
      subject: "OQEP Survey Invitation",
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
        <h2>OQEP Employee Survey</h2>
        <p>Please click the secure link below to start your survey:</p>
        <p><a href="${surveyLink}" style="display:inline-block;padding:10px 20px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;">Start Survey</a></p>
        <p style="word-break:break-all;font-size:12px;color:#6b7280;">${surveyLink}</p>
      </div>`,
    });

    await EmployeeInvite.updateOne(
      { email: TEST_EMAIL },
      { $set: { emailSent: true, emailSentAt: new Date() } }
    );

    console.log("\n📧 Email sent to:", TEST_EMAIL);
    console.log("   Stream     :", EMPLOYEE.stream);
    console.log("   Function   :", EMPLOYEE.function);
    console.log("   Department :", EMPLOYEE.department);
    console.log("   Location   :", EMPLOYEE.location);
    console.log("   Age        :", EMPLOYEE.age);
    console.log("   Gender     :", EMPLOYEE.gender);
    console.log("\n🔗 Local test link (if needed):");
    console.log("   http://localhost:3000/survey?token=" + raw);
  } catch (err) {
    console.error("❌ Error:", err.message || err);
  } finally {
    await mongoose.disconnect();
  }
})();
