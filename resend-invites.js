// resend-invites.js — run with: node resend-invites.js (from backend dir)
const mongoose = require("mongoose");
const crypto = require("crypto");
const sgMail = require("@sendgrid/mail");

const DB_URL = "mongodb://oqep_app:Oqep%402026@127.0.0.1:27017/oqep";
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@oqep.remedygcc.com";
const SCANNER_BASE_URL = process.env.SCANNER_BASE_URL || "https://oqep.remedygcc.com/survey";

sgMail.setApiKey(SENDGRID_API_KEY);

function generateInviteToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

function buildEmailHtml(inviteLink) {
  return `
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
}

async function main() {
  await mongoose.connect(DB_URL);
  console.log("Connected to DB");

  const db = mongoose.connection.db;
  const invites = await db.collection("employee_invites").find({ emailSent: false }).toArray();
  console.log(`Found ${invites.length} pending invites`);

  for (const invite of invites) {
    const token = generateInviteToken();
    const inviteLink = `${SCANNER_BASE_URL}?token=${token.raw}`;

    try {
      await sgMail.send({
        to: invite.email,
        from: EMAIL_FROM,
        subject: "OQEP Mental Wellbeing Survey 2026 Invitation",
        html: buildEmailHtml(inviteLink),
      });

      await db.collection("employee_invites").updateOne(
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

      console.log(`✓ Sent to ${invite.email} | token: ${token.raw.substring(0, 12)}... | hash: ${token.hash.substring(0, 12)}...`);
    } catch (err) {
      console.error(`✗ Failed for ${invite.email}:`, err.message);
    }
  }

  await mongoose.disconnect();
  console.log("Done!");
}

main().catch(console.error);
