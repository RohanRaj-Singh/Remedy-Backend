require("dotenv/config");
const sgMail = require("@sendgrid/mail");

const to = process.argv[2] || "tahalakti@gmail.com";
const apiKey = process.env.SENDGRID_API_KEY;
const from = process.env.EMAIL_FROM || "noreply@oqep.remedygcc.com";
const testLink = process.env.SCANNER_SECURITY_TEST_URL || "https://oqep.remedygcc.com/security-test";

if (!apiKey || apiKey.includes("PASTE_YOUR_SENDGRID_API_KEY_HERE")) {
  console.error("Missing valid SENDGRID_API_KEY in .env");
  process.exit(1);
}

sgMail.setApiKey(apiKey);

const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
    <h2 style="margin-bottom: 8px;">Remedy - OQEP Security Test Email</h2>
    <p>Dear Team,</p>
    <p>
      This is a technical test email to verify the deliverability and security
      whitelisting for the upcoming OQEP Engagement Survey.
    </p>
    <p>Best regards,<br/>Remedy Team</p>
    <p>
      <a href="${testLink}" style="display:inline-block;padding:10px 16px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;">
        Open Test Link
      </a>
    </p>
    <p>Direct URL: ${testLink}</p>
  </div>
`;

(async () => {
  try {
    await sgMail.send({
      to,
      from,
      subject: "OQEP Security Test Email",
      html,
    });

    console.log(`Test email sent successfully to ${to} from ${from}`);
  } catch (error) {
    const message =
      error?.response?.body?.errors?.[0]?.message ||
      error?.message ||
      "Unknown SendGrid error";
    console.error(`Failed to send test email: ${message}`);
    process.exit(1);
  }
})();
