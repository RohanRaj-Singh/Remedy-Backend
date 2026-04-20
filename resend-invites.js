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
      <p>Dear Colleague,</p>
      <p>At OQEP, we are committed to continuous improvement and value your honest feedback. We are pleased to invite you to participate in our <strong>Employee Engagement Survey</strong>.</p>
      <p>Your insights are vital in helping us shape a better workplace and enhance our operational excellence.</p>
      <p style="margin-top: 24px;"><strong>How to Participate:</strong><br>
      Please click your secure, individualized link below to begin:</p>
      <p style="margin: 24px 0;">
        <a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:15px;">
          Start Your Survey
        </a>
      </p>
      <p style="font-size: 13px; color: #6b7280; word-break: break-all;">
        If the button does not work, copy and paste this link into your browser:<br>${inviteLink}
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
      <p style="margin-bottom: 8px;"><strong>Important Information:</strong></p>
      <ul style="padding-left: 20px; line-height: 2;">
        <li><strong>Anonymity:</strong> Your responses are strictly confidential.</li>
        <li><strong>Personalized Link:</strong> This link is unique to you. Please do not forward this email.</li>
        <li><strong>Pre-filled Data:</strong> Your department and location details are already integrated.</li>
      </ul>
      <p style="margin-top: 24px;">Thank you for your time and for contributing to the future of OQEP.</p>
      <p style="margin-top: 32px;">Best regards,<br/><strong>In collaboration with Remedy</strong></p>
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
        subject: "OQEP Employee Engagement Survey Invitation",
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
