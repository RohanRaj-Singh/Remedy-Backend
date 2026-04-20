// test-token.js — Verify the scanner session flow works
const crypto = require("crypto");
const http = require("https");

const raw = crypto.randomBytes(32).toString("hex");
const hash = crypto.createHash("sha256").update(raw).digest("hex");

console.log("Test raw token:", raw);
console.log("Test hash:", hash);

// Update mtahalakti invite with known token for testing
const mongoose = require("mongoose");
const DB_URL = "mongodb://oqep_app:Oqep%402026@127.0.0.1:27017/oqep";

async function main() {
  await mongoose.connect(DB_URL);
  const db = mongoose.connection.db;

  // Save the old hash so we can restore
  const invite = await db.collection("employee_invites").findOne({ email: "mtahalakti@gmail.com" });
  const oldHash = invite.tokenHash;
  console.log("Old hash:", oldHash);

  // Set our test hash
  await db.collection("employee_invites").updateOne(
    { email: "mtahalakti@gmail.com" },
    { $set: { tokenHash: hash, tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }
  );
  console.log("Updated invite with test hash");

  // Now test the scanner/session endpoint
  const url = `https://api.oqep.remedygcc.com/api/survey/scanner/session?token=${raw}`;
  console.log("Testing URL:", url);

  const result = await new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    }).on("error", reject);
  });

  console.log("Response status:", result.status);
  console.log("Response body:", result.body);

  // Restore original hash
  await db.collection("employee_invites").updateOne(
    { email: "mtahalakti@gmail.com" },
    { $set: { tokenHash: oldHash } }
  );
  console.log("Restored original hash");

  await mongoose.disconnect();
}

main().catch(console.error);
