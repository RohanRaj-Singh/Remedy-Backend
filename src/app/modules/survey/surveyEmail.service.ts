import crypto from "crypto";
import fs from "fs";
import httpStatus from "http-status";
import { Types } from "mongoose";
import * as XLSX from "xlsx";
import sgMail from "@sendgrid/mail";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

import { AppError } from "../../utils/app_error";
import { organizationModel } from "../organization/organization.model";
import { EmployeeInviteModel } from "./employeeInvite.model";
import {
  ISurveyReference,
  SurveyReferenceModel,
  TSurveyReferenceKind,
} from "./surveyReference.model";
import { SurveyService } from "./survey.service";

type TImportSummary = {
  totalRows: number;
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; reason: string }>;
};

type TImportRow = {
  email: string;
  stream: string;
  function: string;
  department: string;
  location: string;
  age: string;
  gender: "male" | "female" | "other";
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeCell = (value: unknown) => {
  return String(value ?? "").trim();
};

const normalizeHeader = (value: unknown) => {
  return normalizeCell(value).toLowerCase().replace(/[^a-z]/g, "");
};

const toCanonicalLabel = (value: string) => {
  return value
    .trim()
    .replace(/&/g, " And ")
    .replace(/\//g, " Or ")
    .replace(/,/g, " ")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ /g, "_");
};

const toCanonicalLocation = (value: string) => {
  const normalized = value.trim().toLowerCase();

  if (["muscat", "head office", "headoffice", "head_office"].includes(normalized)) {
    return "headOffice";
  }

  if (["b60", "block 60", "block60"].includes(normalized)) {
    return "block60";
  }

  if (["musandam", "msusundam", "musundam"].includes(normalized)) {
    return "msusundam";
  }

  return value;
};

const toCanonicalGender = (value: string): "male" | "female" | "other" => {
  const normalized = value.trim().toLowerCase();

  if (normalized === "male") return "male";
  if (normalized === "female") return "female";
  if (normalized === "other") return "other";

  throw new AppError(`Invalid gender value: ${value}`, httpStatus.BAD_REQUEST);
};

const toCanonicalAge = (value: string) => {
  const normalized = value.trim();
  const aliases: Record<string, string> = {
    "18-25": "18-24",
    "18-24": "18-24",
    "25-34": "25-34",
    "35-44": "35-44",
    "44-54": "45-54",
    "45-54": "45-54",
    "55+": "55+",
  };

  return aliases[normalized] || normalized;
};

const generateInviteToken = () => {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
};

const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const getOrCreateReference = async (
  organizationId: string,
  kind: TSurveyReferenceKind,
  name: string
): Promise<ISurveyReference & { _id: Types.ObjectId }> => {
  const normalizedName = name.trim().toLowerCase();

  let ref = await SurveyReferenceModel.findOne({
    organizationId,
    kind,
    normalizedName,
  });

  if (!ref) {
    ref = await SurveyReferenceModel.create({
      organizationId,
      kind,
      name,
      normalizedName,
    });
  }

  return ref as ISurveyReference & { _id: Types.ObjectId };
};

const parseExcelRows = (filePath: string): TImportRow[] => {
  const workbook = XLSX.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new AppError("Excel file has no sheets", httpStatus.BAD_REQUEST);
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  // Log actual headers found (first row) for debugging
  if (rawRows.length > 0) {
    console.log("[Excel Import] Headers found:", Object.keys(rawRows[0]));
  }

  // Aliases: maps normalized header → canonical field name
  const HEADER_ALIASES: Record<string, string> = {
    // email
    email: "email",
    emailaddress: "email",
    employeeemail: "email",
    workemail: "email",
    personalemail: "email",
    mail: "email",
    // stream
    stream: "stream",
    streamname: "stream",
    businessstream: "stream",
    // function
    function: "function",
    jobfunction: "function",
    workfunction: "function",
    fn: "function",
    func: "function",
    functiontext: "function",
    functionstext: "function",
    // department
    department: "department",
    dept: "department",
    departmentname: "department",
    unitdepartment: "department",
    unit: "department",
    // location
    location: "location",
    worklocation: "location",
    site: "location",
    office: "location",
    branch: "location",
    personnelarea: "location",
    area: "location",
    // age
    age: "age",
    agegroup: "age",
    agerange: "age",
    ageband: "age",
    agecategory: "age",
    ageofemployee: "age",
    employeeage: "age",
    // gender
    gender: "gender",
    sex: "gender",
  };

  return rawRows.map((row) => {
    const normalizedRow: Record<string, string> = {};

    Object.entries(row).forEach(([key, value]) => {
      const normalizedKey = normalizeHeader(key);
      const canonicalKey = HEADER_ALIASES[normalizedKey] ?? normalizedKey;
      // Keep both the canonical and the raw normalized key so both lookups work
      normalizedRow[canonicalKey] = normalizeCell(value);
      normalizedRow[normalizedKey] = normalizeCell(value);
    });

    const email = normalizedRow.email;
    const stream = normalizedRow.stream;
    const fn = normalizedRow.function;
    const department = normalizedRow.department;
    const location = normalizedRow.location;
    const age = normalizedRow.age;
    const gender = normalizedRow.gender;

    return {
      email,
      stream,
      function: fn,
      department,
      location,
      age,
      gender: gender as "male" | "female" | "other",
    };
  });
};

const validateRow = (row: TImportRow) => {
  const missing = (["email", "stream", "function", "department", "location", "age", "gender"] as const)
    .filter((f) => !row[f]);

  if (missing.length > 0) {
    throw new AppError(`Missing columns: ${missing.join(", ")}`, httpStatus.BAD_REQUEST);
  }

  if (!EMAIL_REGEX.test(row.email)) {
    throw new AppError(`Invalid email: ${row.email}`, httpStatus.BAD_REQUEST);
  }
};

const sendWithSendGrid = async (to: string, subject: string, html: string) => {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new AppError(
      "Missing SENDGRID_API_KEY or EMAIL_FROM env vars",
      httpStatus.BAD_REQUEST
    );
  }

  sgMail.setApiKey(apiKey);

  await sgMail.send({
    to,
    from,
    subject,
    html,
  });
};

const sendWithSes = async (to: string, subject: string, html: string) => {
  const region = process.env.AWS_SES_REGION;
  const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY;
  const from = process.env.EMAIL_FROM;

  if (!region || !accessKeyId || !secretAccessKey || !from) {
    throw new AppError(
      "Missing SES env vars or EMAIL_FROM",
      httpStatus.BAD_REQUEST
    );
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

const sendInviteEmail = async (to: string, inviteLink: string) => {
  const provider = (process.env.EMAIL_PROVIDER || "sendgrid").toLowerCase();
  const subject = "OQEP Employee Engagement Survey Invitation";
  const html = `
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

  if (provider === "ses") {
    await sendWithSes(to, subject, html);
    return;
  }

  await sendWithSendGrid(to, subject, html);
};

const normalizeUrl = (value: string) => {
  if (!value) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `https://${value}`;
};

const uploadEmployeeExcel = async (payload: {
  organizationId: string;
  filePath: string;
}) => {
  const { organizationId, filePath } = payload;

  const organization = await organizationModel.findById(organizationId);
  if (!organization) {
    throw new AppError("Organization not found", httpStatus.NOT_FOUND);
  }

  const rows = parseExcelRows(filePath);

  const summary: TImportSummary = {
    totalRows: rows.length,
    inserted: 0,
    updated: 0,
    failed: 0,
    errors: [],
  };

  // ── Step 1: validate all rows first, collect valid ones ──────────────────
  type ValidatedRow = {
    rowNumber: number;
    normalizedEmail: string;
    canonicalStream: string;
    canonicalFunction: string;
    canonicalDepartment: string;
    canonicalLocation: string;
    canonicalAge: string;
    canonicalGender: "male" | "female" | "other";
  };

  const validRows: ValidatedRow[] = [];

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rowNumber = index + 2;
    try {
      validateRow(row);
      validRows.push({
        rowNumber,
        normalizedEmail: row.email.trim().toLowerCase(),
        canonicalStream: toCanonicalLabel(row.stream),
        canonicalFunction: toCanonicalLabel(row.function),
        canonicalDepartment: toCanonicalLabel(row.department),
        canonicalLocation: toCanonicalLocation(row.location),
        canonicalAge: toCanonicalAge(row.age),
        canonicalGender: toCanonicalGender(row.gender),
      });
    } catch (err: any) {
      summary.failed += 1;
      summary.errors.push({ row: rowNumber, reason: err.message });
    }
  }

  if (validRows.length === 0) {
    return summary;
  }

  // ── Step 2: collect all unique label values per kind ─────────────────────
  const uniqueLabels: Record<string, Set<string>> = {
    stream: new Set(),
    function: new Set(),
    department: new Set(),
    location: new Set(),
  };

  for (const r of validRows) {
    uniqueLabels.stream.add(r.canonicalStream);
    uniqueLabels.function.add(r.canonicalFunction);
    uniqueLabels.department.add(r.canonicalDepartment);
    uniqueLabels.location.add(r.canonicalLocation);
  }

  // ── Step 3: bulk upsert references, then load them all in ONE query each ─
  const refCache: Record<string, Record<string, Types.ObjectId>> = {
    stream: {},
    function: {},
    department: {},
    location: {},
  };

  for (const kind of ["stream", "function", "department", "location"] as const) {
    const names = Array.from(uniqueLabels[kind]);

    // Upsert all unique names in parallel
    await Promise.all(
      names.map((name) =>
        SurveyReferenceModel.updateOne(
          { organizationId, kind, normalizedName: name.trim().toLowerCase() },
          { $setOnInsert: { organizationId: new Types.ObjectId(organizationId), kind, name, normalizedName: name.trim().toLowerCase() } },
          { upsert: true }
        )
      )
    );

    // Load them all in one query
    const refs = await SurveyReferenceModel.find({
      organizationId,
      kind,
      normalizedName: { $in: names.map((n) => n.trim().toLowerCase()) },
    }).lean();

    for (const ref of refs) {
      refCache[kind][ref.normalizedName] = ref._id as Types.ObjectId;
    }
  }

  // ── Step 4: build bulkWrite ops for all invites ───────────────────────────
  const bulkOps = validRows.map((r) => {
    const token = generateInviteToken();
    const streamRefId = refCache.stream[r.canonicalStream.trim().toLowerCase()];
    const functionRefId = refCache.function[r.canonicalFunction.trim().toLowerCase()];
    const departmentRefId = refCache.department[r.canonicalDepartment.trim().toLowerCase()];
    const locationRefId = refCache.location[r.canonicalLocation.trim().toLowerCase()];

    return {
      updateOne: {
        filter: { organizationId, email: r.normalizedEmail },
        update: {
          $set: {
            organizationId: new Types.ObjectId(organizationId),
            email: r.normalizedEmail,
            streamRef: streamRefId,
            functionRef: functionRefId,
            departmentRef: departmentRefId,
            locationRef: locationRefId,
            stream: r.canonicalStream,
            function: r.canonicalFunction,
            department: r.canonicalDepartment,
            location: r.canonicalLocation,
            age: r.canonicalAge,
            gender: r.canonicalGender,
            tokenHash: token.hash,
            tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            completed: false,
          },
          $setOnInsert: {
            emailSent: false,
            completedAt: undefined,
            lastSurveyId: undefined,
          },
        },
        upsert: true,
      },
    };
  });

  // ── Step 5: execute bulk write ─────────────────────────────────────────────
  const bulkResult = await EmployeeInviteModel.bulkWrite(bulkOps, { ordered: false });

  summary.inserted = bulkResult.upsertedCount ?? 0;
  summary.updated = bulkResult.modifiedCount ?? 0;

  // Clean up temp file
  try { fs.unlinkSync(filePath); } catch { /* ignore */ }

  return summary;
};

const validateScannerToken = async (token: string) => {
  if (!token) {
    throw new AppError("Token is required", httpStatus.BAD_REQUEST);
  }

  const tokenHash = hashToken(token);

  const invite = await EmployeeInviteModel.findOne({
    tokenHash,
    tokenExpiresAt: { $gt: new Date() },
  });

  if (!invite) {
    throw new AppError("Invalid or expired token", httpStatus.UNAUTHORIZED);
  }

  return invite;
};

const getScannerSession = async (token: string) => {
  const invite = await validateScannerToken(token);

  return {
    inviteId: invite._id,
    organizationId: invite.organizationId,
    completed: invite.completed,
    prefill: {
      stream: invite.stream,
      function: invite.function,
      department: invite.department,
      location: invite.location,
      age: invite.age,
      gender: invite.gender,
    },
    seniorityRequired: true,
  };
};

const startSurveyByToken = async (payload: {
  token: string;
  seniorityLevel: "senior" | "manager" | "employee";
}) => {
  const invite = await validateScannerToken(payload.token);

  if (invite.completed) {
    throw new AppError("Survey already completed", httpStatus.BAD_REQUEST);
  }

  const result = await SurveyService.startSurvey({
    organizationId: invite.organizationId,
    stream: invite.stream as any,
    function: invite.function as any,
    department: invite.department as any,
    location: invite.location as any,
    age: invite.age as any,
    gender: invite.gender,
    seniorityLevel: payload.seniorityLevel,
  });

  await EmployeeInviteModel.updateOne(
    { _id: invite._id },
    { $set: { lastSurveyId: result.survey._id } }
  );

  return result;
};

const markInviteCompleted = async (payload: {
  token: string;
  surveyId?: string;
}) => {
  const invite = await validateScannerToken(payload.token);

  await EmployeeInviteModel.updateOne(
    { _id: invite._id },
    {
      $set: {
        completed: true,
        completedAt: new Date(),
        ...(payload.surveyId ? { lastSurveyId: new Types.ObjectId(payload.surveyId) } : {}),
      },
    }
  );

  return { completed: true };
};

const sendInvitationEmails = async (payload: {
  organizationId: string;
  onlyPending?: boolean;
  limit?: number;
}) => {
  const organization = await organizationModel.findById(payload.organizationId);

  if (!organization) {
    throw new AppError("Organization not found", httpStatus.NOT_FOUND);
  }

  const scannerBaseUrl =
    process.env.SCANNER_BASE_URL ||
    organization.survayProvideLink ||
    "https://scanner.oqep.com/start";

  const filter: Record<string, unknown> = {
    organizationId: payload.organizationId,
  };

  if (payload.onlyPending !== false) {
    filter.emailSent = false;
  }

  const invites = await EmployeeInviteModel.find(filter)
    .sort({ createdAt: 1 })
    .limit(payload.limit || 200);

  const report = {
    totalSelected: invites.length,
    sent: 0,
    failed: 0,
    errors: [] as Array<{ email: string; reason: string }>,
  };

  for (const invite of invites) {
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
    } catch (error: any) {
      report.failed += 1;
      report.errors.push({
        email: invite.email,
        reason: error?.message || "Email send failed",
      });
    }
  }

  return report;
};

const sendSecurityTestEmail = async (payload: {
  toEmail: string;
  customLink?: string;
}) => {
  const toEmail = payload.toEmail.trim().toLowerCase();

  if (!EMAIL_REGEX.test(toEmail)) {
    throw new AppError("Invalid test recipient email", httpStatus.BAD_REQUEST);
  }

  const configuredLink =
    payload.customLink ||
    process.env.SCANNER_SECURITY_TEST_URL ||
    "https://oqep.remedygcc.com/security-test";

  const testLink = normalizeUrl(configuredLink);

  await sendInviteEmail(toEmail, testLink);

  return {
    toEmail,
    testLink,
    provider: (process.env.EMAIL_PROVIDER || "sendgrid").toLowerCase(),
    sentAt: new Date().toISOString(),
  };
};

const getInviteStatusReport = async (payload: { organizationId: string }) => {
  const { organizationId } = payload;

  const [total, sent, completed, pendingSend] = await Promise.all([
    EmployeeInviteModel.countDocuments({ organizationId }),
    EmployeeInviteModel.countDocuments({ organizationId, emailSent: true }),
    EmployeeInviteModel.countDocuments({ organizationId, completed: true }),
    EmployeeInviteModel.countDocuments({ organizationId, emailSent: false }),
  ]);

  const invites = await EmployeeInviteModel.find({ organizationId })
    .select(
      "email emailSent emailSentAt completed completedAt stream function department location age gender"
    )
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  return {
    summary: {
      total,
      sent,
      completed,
      pendingSend,
      notCompleted: sent - completed,
    },
    invites,
  };
};

export const SurveyEmailService = {
  uploadEmployeeExcel,
  getScannerSession,
  startSurveyByToken,
  markInviteCompleted,
  sendInvitationEmails,
  sendSecurityTestEmail,
  getInviteStatusReport,
};
