const fs = require("fs");
const https = require("https");
const path = require("path");
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

const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
  console.error("Missing SENDGRID_API_KEY in .env");
  process.exit(1);
}

const limit = 500;
let offset = 0;
const all = [];

const fetchPage = (off) =>
  new Promise((resolve, reject) => {
    const url = `https://api.sendgrid.com/v3/suppression/blocks?limit=${limit}&offset=${off}`;
    const req = https.request(
      url,
      { headers: { Authorization: `Bearer ${apiKey}` } },
      (res) => {
        let data = "";
        res.on("data", (c) => {
          data += c;
        });
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`Status ${res.statusCode}: ${data}`));
          }
          try {
            const json = JSON.parse(data);
            resolve(json);
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });

const run = async () => {
  while (true) {
    const page = await fetchPage(offset);
    if (!Array.isArray(page)) {
      throw new Error("Unexpected response from SendGrid");
    }
    all.push(...page);
    if (page.length < limit) break;
    offset += limit;
  }

  const header = "email,created,reason,status\n";
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = all.map((i) =>
    [esc(i.email), esc(i.created), esc(i.reason), esc(i.status)].join(",")
  );

  const outCsv = path.join(__dirname, "..", "blocked-emails.csv");
  const outTxt = path.join(__dirname, "..", "blocked-emails.txt");

  fs.writeFileSync(outCsv, header + lines.join("\n"));
  fs.writeFileSync(outTxt, all.map((i) => i.email).join("\n"));

  console.log("Blocked count:", all.length);
  console.log("Saved:", outCsv);
  console.log("Saved:", outTxt);
};

run().catch((err) => {
  console.error("Fetch failed:", err.message || err);
  process.exit(1);
});
