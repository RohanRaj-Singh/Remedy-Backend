require("dotenv/config");
const mongoose = require("mongoose");
const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");

// ── Config ────────────────────────────────────────────────────────────────────
const TEST_EMAIL = "tahalakti@gmail.com";

// Use the real OQEP org ID from the DB — adjust if needed
const ORG_ID = "6902bda0c0f78f02d2067668";

// Employee details we are inserting — tell the user these values to verify
const EMPLOYEE = {
  stream: "People_Technology_And_Culture",
  function: "IDS_And_CI",
  department: "IDS_And_CI",
  location: "headOffice",   // displays as "Muscat" in the UI
  age: "25-34",
  gender: "male",
};

// ── Mongoose schemas (inline, no TS) ─────────────────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
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

const generateToken = () => {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
};

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("✅ Connected to MongoDB");

    // 1. Create/find SurveyReference entries
    console.log("\n📌 Resolving references...");
    const streamRef    = await getOrCreate("stream",     EMPLOYEE.stream);
    const functionRef  = await getOrCreate("function",   EMPLOYEE.function);
    const deptRef      = await getOrCreate("department", EMPLOYEE.department);
    const locationRef  = await getOrCreate("location",   EMPLOYEE.location);

    // 2. Generate token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // 3. Upsert invite record
    console.log("\n👤 Upserting employee invite...");
    await EmployeeInvite.findOneAndUpdate(
      { organizationId: ORG_ID, email: TEST_EMAIL },
      {
        organizationId: new mongoose.Types.ObjectId(ORG_ID),
        email: TEST_EMAIL,
        streamRef:    streamRef._id,
        functionRef:  functionRef._id,
        departmentRef: deptRef._id,
        locationRef:  locationRef._id,
        stream:       EMPLOYEE.stream,
        function:     EMPLOYEE.function,
        department:   EMPLOYEE.department,
        location:     EMPLOYEE.location,
        age:          EMPLOYEE.age,
        gender:       EMPLOYEE.gender,
        tokenHash:    token.hash,
        tokenExpiresAt: expiresAt,
        emailSent:    false,
        completed:    false,
      },
      { upsert: true, new: true }
    );
    console.log("  ✅ Invite record saved");

    // 4. Build survey link
    const baseUrl = process.env.SCANNER_BASE_URL || "https://oqep.remedygcc.com/survey";
    const surveyLink = `${baseUrl}?token=${token.raw}`;

    // 5. Send the email
    console.log("\n📧 Sending invite email...");
    const apiKey = process.env.SENDGRID_API_KEY;
    const from   = process.env.EMAIL_FROM || "noreply@oqep.remedygcc.com";
    sgMail.setApiKey(apiKey);

    await sgMail.send({
      to: TEST_EMAIL,
      from,
      subject: "OQEP Survey Invitation — Auto-fill Test",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
          <h2>OQEP Employee Survey</h2>
          <p>This is a test invite for auto-fill verification. Click the link below to open your pre-filled survey:</p>
          <p>
            <a href="${surveyLink}"
               style="display:inline-block;padding:10px 20px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;">
              Start Survey
            </a>
          </p>
          <p style="word-break:break-all;font-size:12px;color:#6b7280;">${surveyLink}</p>
        </div>
      `,
    });

    // 6. Update emailSent flag
    await EmployeeInvite.updateOne(
      { email: TEST_EMAIL },
      { $set: { emailSent: true, emailSentAt: new Date() } }
    );

    console.log(`  ✅ Email sent to ${TEST_EMAIL} from ${from}`);

    // 7. Print what was inserted for manual verification
    console.log("\n" + "=".repeat(55));
    console.log("  TEST EMPLOYEE — verify these values in the UI");
    console.log("=".repeat(55));
    console.log(`  Email          : ${TEST_EMAIL}`);
    console.log(`  Stream         : ${EMPLOYEE.stream}`);
    console.log(`  Function       : ${EMPLOYEE.function}`);
    console.log(`  Department     : ${EMPLOYEE.department}`);
    console.log(`  Location       : ${EMPLOYEE.location}  (shown as "Muscat" in UI)`);
    console.log(`  Age            : ${EMPLOYEE.age}`);
    console.log(`  Gender         : ${EMPLOYEE.gender}`);
    console.log(`  Seniority      : (select manually — not pre-filled)`);
    console.log("=".repeat(55));
    console.log(`\n  Survey Link    : ${surveyLink}\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err?.response?.body || err.message || err);
    process.exit(1);
  }
})();
