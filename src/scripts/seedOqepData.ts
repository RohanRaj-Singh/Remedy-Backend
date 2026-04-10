import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { User } from "../app/modules/user/user.schema";
import { questionModel } from "../app/modules/question/question.model";
import { buildMongoConnectOptions } from "../config/mongoOptions";

type QuestionSeed = {
  id: string;
  question: string;
  options: string[];
  domain: string;
  weight: number;
  isInverted: boolean;
  isFollowUp: boolean;
  dashboardDomain: string;
  dashboardDomainMaxPossibleScore: number;
  dashboardDomainWeight: number;
  isDeleted?: boolean;
};

type SeedSummary = {
  adminCreated: boolean;
  adminUpdated: boolean;
  questionsInserted: number;
  questionsUpdated: number;
  totalQuestionSeedRows: number;
};

const ADMIN_SEED = {
  name: "Admin",
  email: "admin@remedy.com",
  password: "admin123",
  role: "admin",
} as const;

function shouldExecute(argv: string[]): boolean {
  return argv.includes("--execute");
}

function resolveQuestionSeedPath(): string {
  return path.resolve(__dirname, "../../question.json");
}

async function loadQuestionSeed(): Promise<QuestionSeed[]> {
  const filePath = resolveQuestionSeedPath();
  const fileContents = await fs.readFile(filePath, "utf8");
  const raw = JSON.parse(fileContents) as QuestionSeed[];

  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("question.json is empty or invalid.");
  }

  return raw.map((question) => ({
    ...question,
    isDeleted: question.isDeleted ?? false,
  }));
}

async function previewSeed(): Promise<void> {
  const questions = await loadQuestionSeed();

  const followUpCount = questions.filter((question) => question.isFollowUp).length;
  const mainCount = questions.length - followUpCount;

  console.log("OQEP seed preview");
  console.log(`- Admin seed email: ${ADMIN_SEED.email}`);
  console.log(`- Question seed file: ${resolveQuestionSeedPath()}`);
  console.log(`- Total questions: ${questions.length}`);
  console.log(`- Main questions: ${mainCount}`);
  console.log(`- Follow-up questions: ${followUpCount}`);
  console.log("");
  console.log("Preview only. No data was written.");
  console.log("Run with --execute to apply the seed.");
}

async function seedAdmin(summary: SeedSummary): Promise<void> {
  const hashedPassword = await bcrypt.hash(ADMIN_SEED.password, 12);

  const existingAdmin = await User.findOne({ email: ADMIN_SEED.email });

  if (!existingAdmin) {
    await User.create({
      name: ADMIN_SEED.name,
      email: ADMIN_SEED.email,
      password: hashedPassword,
      role: ADMIN_SEED.role,
    });
    summary.adminCreated = true;
    return;
  }

  const updates: Record<string, unknown> = {};

  if (existingAdmin.name !== ADMIN_SEED.name) {
    updates.name = ADMIN_SEED.name;
  }

  if (existingAdmin.role !== ADMIN_SEED.role) {
    updates.role = ADMIN_SEED.role;
  }

  const passwordMatches = await bcrypt.compare(
    ADMIN_SEED.password,
    existingAdmin.password ?? ""
  );

  if (!passwordMatches) {
    updates.password = hashedPassword;
  }

  if (Object.keys(updates).length > 0) {
    await User.updateOne({ _id: existingAdmin._id }, { $set: updates });
    summary.adminUpdated = true;
  }
}

async function seedQuestions(summary: SeedSummary): Promise<void> {
  const questions = await loadQuestionSeed();
  summary.totalQuestionSeedRows = questions.length;

  for (const question of questions) {
    const existing = await questionModel.findOne({ id: question.id }).select("_id");

    if (!existing) {
      await questionModel.create(question);
      summary.questionsInserted += 1;
      continue;
    }

    await questionModel.updateOne(
      { _id: existing._id },
      {
        $set: {
          question: question.question,
          options: question.options,
          domain: question.domain,
          weight: question.weight,
          isInverted: question.isInverted,
          isFollowUp: question.isFollowUp,
          dashboardDomain: question.dashboardDomain,
          dashboardDomainMaxPossibleScore: question.dashboardDomainMaxPossibleScore,
          dashboardDomainWeight: question.dashboardDomainWeight,
          isDeleted: question.isDeleted ?? false,
        },
      }
    );
    summary.questionsUpdated += 1;
  }
}

async function main(): Promise<void> {
  const execute = shouldExecute(process.argv.slice(2));

  if (!execute) {
    await previewSeed();
    return;
  }

  const dbUrl = process.env.DB_URL?.trim();

  if (!dbUrl) {
    throw new Error("Missing required environment variable: DB_URL");
  }

  await mongoose.connect(dbUrl, buildMongoConnectOptions(dbUrl));

  const summary: SeedSummary = {
    adminCreated: false,
    adminUpdated: false,
    questionsInserted: 0,
    questionsUpdated: 0,
    totalQuestionSeedRows: 0,
  };

  await seedAdmin(summary);
  await seedQuestions(summary);

  console.log("OQEP seed completed");
  console.log(`- Admin created: ${summary.adminCreated}`);
  console.log(`- Admin updated: ${summary.adminUpdated}`);
  console.log(`- Questions inserted: ${summary.questionsInserted}`);
  console.log(`- Questions updated: ${summary.questionsUpdated}`);
  console.log(`- Total seed rows processed: ${summary.totalQuestionSeedRows}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
