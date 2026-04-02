require("dotenv/config");
const mongoose = require("mongoose");
const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");

const ORG_ID = "6902bda0c0f78f02d2067668";

const RECIPIENTS = [
  { email: "Turki@remedyway.om" },
  { email: "mtahalakti@gmail.com" },
];

const EMPLOYEE = {
  stream:     "People_Technology_And_Culture",
  function:   "IDS_And_CI",
  department: "IDS_And_CI",
  location:   "headOffice",
  age:        "35-44",
  gender:     "male",
};

const refSchema   = new mongoose.Schema({}, { strict: false });
const SurveyRef   = mongoose.model("survey_references",  refSchema);
const inviteSchema = new mongoose.Schema({}, { strict: false });
const EmployeeInvite = mongoose.model("employee_invites", inviteSchema);

const getOrCreate = async (kind, name) => {
  const normalized = name.trim().toLowerCase();
  let ref = await SurveyRef.findOne({ organizationId: ORG_ID, kind, normalizedName: normalized });
  if (!ref) {
    ref = await SurveyRef.create({
      organizationId: new mongoose.Types.ObjectId(ORG_ID),
      kind, name, normalizedName: normalized,
    });
  }
  return ref;
};

const buildEmailHtml = (surveyLink) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.8; color: #111827; max-width: 620px; margin: 0 auto; padding: 32px 24px;">

    <p>Dear Colleague,</p>

    <p>At OQEP, we are committed to continuous improvement and value your honest feedback. We are pleased to invite you to participate in our <strong>Employee Engagement Survey</strong>.</p>

    <p>Your insights are vital in helping us shape a better workplace and enhance our operational excellence.</p>

    <p style="margin-top: 24px;"><strong>How to Participate:</strong><br>
    Please click your secure, individualized link below to begin:</p>

    <p style="margin: 24px 0;">
      <a href="${surveyLink}" style="display:inline-block;padding:12px 24px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">
        Start Your Survey
      </a>
    </p>

    <p style="font-size: 13px; color: #6b7280; word-break: break-all;">
      If the button does not work, copy and paste this link into your browser:<br>${surveyLink}
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />

    <p style="margin-bottom: 8px;"><strong>Important Information:</strong></p>
    <ul style="padding-left: 20px; line-height: 2;">
      <li><strong>Anonymity:</strong> Your responses are strictly confidential. Data is aggregated, and individual answers cannot be traced back to you.</li>
      <li><strong>Personalized Link:</strong> This link is unique to you. Please do not forward this email, as it will expire once your survey is submitted.</li>
      <li><strong>Pre-filled Data:</strong> Your department and location details are already integrated; you only need to answer the survey questions.</li>
    </ul>

    <p style="margin-top: 24px;">Thank you for your time and for contributing to the future of OQEP.</p>

    <p style="margin-top: 32px;">
      Best regards,<br/>
      <strong>In collaboration with Remedy</strong>
    </p>

  </div>
`;

(async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("✅ Connected to MongoDB\n");

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const streamRef     = await getOrCreate("stream",     EMPLOYEE.stream);
    const functionRef   = await getOrCreate("function",   EMPLOYEE.function);
    const departmentRef = await getOrCreate("department", EMPLOYEE.department);
    const locationRef   = await getOrCreate("location",   EMPLOYEE.location);

    for (const recipient of RECIPIENTS) {
      const raw      = crypto.randomBytes(32).toString("hex");
      const hash     = crypto.createHash("sha256").update(raw).digest("hex");
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await EmployeeInvite.updateOne(
        { organizationId: new mongoose.Types.ObjectId(ORG_ID), email: recipient.email },
        {
          $set: {
            organizationId: new mongoose.Types.ObjectId(ORG_ID),
            email:          recipient.email,
            streamRef:      streamRef._id,
            functionRef:    functionRef._id,
            departmentRef:  departmentRef._id,
            locationRef:    locationRef._id,
            ...EMPLOYEE,
            tokenHash:      hash,
            tokenExpiresAt: expiresAt,
            emailSent:      false,
            completed:      false,
          },
        },
        { upsert: true }
      );

      const baseUrl    = process.env.SCANNER_BASE_URL || "https://oqep.remedygcc.com/survey";
      const surveyLink = `${baseUrl}?token=${raw}`;

      await sgMail.send({
        to:      recipient.email,
        from:    process.env.EMAIL_FROM,
        subject: "OQEP Employee Engagement Survey Invitation",
        html:    buildEmailHtml(surveyLink),
      });

      await EmployeeInvite.updateOne(
        { email: recipient.email },
        { $set: { emailSent: true, emailSentAt: new Date() } }
      );

      console.log("📧 Sent to:", recipient.email);
      console.log("   Link   :", surveyLink, "\n");
    }

    console.log("✅ Done.");
  } catch (err) {
    console.error("❌ Error:", err.message || err);
  } finally {
    await mongoose.disconnect();
  }
})();
