const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const { connectDB } = require("../dist/config/connectDB");
const { organizationModel } = require("../dist/app/modules/organization/organization.model");
const { EmployeeInviteModel } = require("../dist/app/modules/survey/employeeInvite.model");

const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

const getArg = (name, fallback) => {
  const flag = `--${name}`;
  const idx = process.argv.indexOf(flag);
  if (idx >= 0 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  return fallback;
};

const hasFlag = (name) => process.argv.includes(`--${name}`);

const orgId = getArg("org", process.env.ORGANIZATION_ID || "6902bda0c0f78f02d2067668");
const listFile = getArg(
  "file",
  path.join(__dirname, "..", "blocked-emails.txt")
);
const batchSize = Number(getArg("batch-size", "100"));
const offset = Number(getArg("offset", "0"));
const delayMs = Number(getArg("delay-ms", "0"));
const dryRun = hasFlag("dry-run");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const generateInviteToken = () => {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
};

const sendWithSendGrid = async (to, subject, html) => {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error("Missing SENDGRID_API_KEY or EMAIL_FROM env vars");
  }

  sgMail.setApiKey(apiKey);

  await sgMail.send({
    to,
    from,
    subject,
    html,
  });
};

const sendWithSes = async (to, subject, html) => {
  const region = process.env.AWS_SES_REGION;
  const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY;
  const from = process.env.EMAIL_FROM;

  if (!region || !accessKeyId || !secretAccessKey || !from) {
    throw new Error("Missing SES env vars or EMAIL_FROM");
  }

  const ses = new SESClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  const command = new SendEmailCommand({
    Source: from,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: "UTF-8" },
      Body: { Html: { Data: html, Charset: "UTF-8" } },
    },
  });

  await ses.send(command);
};

const sendInviteEmail = async (to, inviteLink) => {
  const provider = (process.env.EMAIL_PROVIDER || "sendgrid").toLowerCase();
  const subject = "OQEP Mental Wellbeing Survey 2026 Invitation";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.8; color: #111827; max-width: 620px; margin: 0 auto; padding: 32px 24px;">

      <p>Dear Employee,</p>

      <p>Welcome to the OQEP Mental Wellbeing Survey 2026.</p>

      <p>This survey aims to understand the current mental wellbeing and workplace experience of OQEP employees. Your feedback is important and will help us shape future wellbeing initiatives and strengthen OQEP's culture of "We Care."</p>

      <p>Please complete the questionnaire based on your own experiences and impressions as an employee at OQEP. There are no right or wrong answers; we simply ask that you respond honestly.</p>

      <p style="margin-top: 24px;"><strong>Start the survey:</strong><br>
      Please use your secure link below:</p>

      <p style="margin: 24px 0;">
        <a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">
          Start Your Survey
        </a>
      </p>

      <p style="font-size: 13px; color: #6b7280; word-break: break-all;">
        If the button does not work, copy and paste this link into your browser:<br>${inviteLink}
      </p>

      <p>The survey is a joint initiative between the Culture Team and the Occupational Health Team as part of the TAZZIZ 2026 program.</p>

      <p>Your privacy and confidentiality are very important to us. The OQEP Mental Wellbeing Survey is being conducted by the third-party consultancy company Remedy on behalf of OQEP. All responses will remain strictly confidential and will be processed in accordance with applicable data protection requirements and the OQEP Code of Conduct. OQEP will act as the data controller, and no individual responses will be shared with management.</p>

      <p>Thank you for taking the time to share your feedback and support OQEP's journey toward a healthier, more supportive workplace.</p>

      <p style="margin-top: 32px;">Regards,</p>

    </div>
  `;

  if (provider === "ses") {
    await sendWithSes(to, subject, html);
    return;
  }

  await sendWithSendGrid(to, subject, html);
};

const run = async () => {
  if (!fs.existsSync(listFile)) {
    throw new Error(`List file not found: ${listFile}`);
  }

  const listRaw = fs.readFileSync(listFile, "utf8");
  const listAll = listRaw
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^"|"$/g, ""))
    .filter((line) => line);

  const uniqueList = Array.from(new Set(listAll.map((e) => e.toLowerCase())));
  const batchEmails = uniqueList.slice(offset, offset + batchSize);

  if (batchEmails.length === 0) {
    console.log("No emails to send in this batch.");
    return;
  }

  await connectDB();

  const organization = await organizationModel.findById(orgId);
  if (!organization) {
    throw new Error("Organization not found for provided org ID.");
  }

  const scannerBaseUrl =
    process.env.SCANNER_BASE_URL ||
    organization.survayProvideLink ||
    "https://scanner.oqep.com/start";

  const invites = await EmployeeInviteModel.find({
    organizationId: orgId,
    email: { $in: batchEmails },
    completed: { $ne: true },
  }).lean();

  const inviteByEmail = new Map(invites.map((i) => [i.email, i]));
  const toSend = batchEmails.filter((email) => inviteByEmail.has(email));
  const notFound = batchEmails.filter((email) => !inviteByEmail.has(email));

  const report = {
    totalList: uniqueList.length,
    batchOffset: offset,
    batchSizeRequested: batchSize,
    batchSizeActual: batchEmails.length,
    foundInvites: toSend.length,
    notFoundCount: notFound.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  if (dryRun) {
    console.log("DRY RUN:", report);
    return;
  }

  for (const email of toSend) {
    const invite = inviteByEmail.get(email);
    if (!invite) continue;

    const token = generateInviteToken();
    const inviteLink = `${scannerBaseUrl}?token=${token.raw}`;

    try {
      await sendInviteEmail(invite.email, inviteLink);

      await EmployeeInviteModel.updateOne(
        { _id: invite._id },
        {
          $set: {
            tokenHash: token.hash,
            tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            emailSent: true,
            emailSentAt: new Date(),
          },
        }
      );

      report.sent += 1;
    } catch (err) {
      report.failed += 1;
      report.errors.push({
        email,
        reason: err && err.message ? err.message : String(err),
      });
    }

    if (delayMs > 0) {
      await sleep(delayMs);
    }
  }

  const reportPath = path.join(
    __dirname,
    "..",
    `resend-blocked-report-${offset}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log("DONE:", report);
  console.log("Report:", reportPath);
};

run().catch((err) => {
  console.error("Failed:", err.message || err);
  process.exit(1);
});
