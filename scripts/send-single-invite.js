require("dotenv/config");
const mongoose = require("mongoose");
const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");

const TEST_EMAIL = "internationaltijarat.com@gmail.com";
const ORG_ID = "6902bda0c0f78f02d2067668";

const inviteSchema = new mongoose.Schema({}, { strict: false });
const EmployeeInvite = mongoose.model("employee_invites", inviteSchema);

(async () => {
  await mongoose.connect(process.env.DB_URL);
  console.log("Connected to MongoDB");

  const existing = await EmployeeInvite.findOne({ email: TEST_EMAIL }).lean();

  if (!existing) {
    console.log("No invite found for", TEST_EMAIL, "— please upload the Excel file first.");
    mongoose.disconnect();
    return;
  }

  // Generate a fresh token
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await EmployeeInvite.updateOne(
    { email: TEST_EMAIL },
    { $set: { tokenHash: hash, tokenExpiresAt: expiresAt, emailSent: false, completed: false } }
  );

  const baseUrl = process.env.SCANNER_BASE_URL || "https://oqep.remedygcc.com/survey";
  const surveyLink = `${baseUrl}?token=${raw}`;

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  await sgMail.send({
    to: TEST_EMAIL,
    from: process.env.EMAIL_FROM,
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

  console.log("\n✅ Email sent to:", TEST_EMAIL);
  console.log("  Stream      :", existing.stream);
  console.log("  Function    :", existing.function);
  console.log("  Department  :", existing.department);
  console.log("  Location    :", existing.location);
  console.log("  Age         :", existing.age);
  console.log("  Gender      :", existing.gender);
  console.log("\n  Production URL :", surveyLink);
  console.log("  Local test URL : http://localhost:3000/survey?token=" + raw);

  mongoose.disconnect();
})();
