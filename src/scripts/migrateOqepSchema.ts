import "dotenv/config";
import mongoose, { Model } from "mongoose";
import { User } from "../app/modules/user/user.schema";
import { organizationModel } from "../app/modules/organization/organization.model";
import { questionModel } from "../app/modules/question/question.model";
import { SurveyResponse } from "../app/modules/survey/survey.model";
import { buildMongoConnectOptions } from "../config/mongoOptions";

type IndexedModel = {
  collectionName: string;
  model: Model<any>;
  additionalIndexes: Array<{
    key: Record<string, 1 | -1>;
    name: string;
    unique?: boolean;
  }>;
};

const indexedModels: IndexedModel[] = [
  {
    collectionName: User.collection.collectionName,
    model: User,
    additionalIndexes: [
      {
        key: { role: 1 },
        name: "role_1",
      },
    ],
  },
  {
    collectionName: organizationModel.collection.collectionName,
    model: organizationModel,
    additionalIndexes: [
      {
        key: { isDelete: 1 },
        name: "isDelete_1",
      },
    ],
  },
  {
    collectionName: questionModel.collection.collectionName,
    model: questionModel,
    additionalIndexes: [
      {
        key: { isDeleted: 1 },
        name: "isDeleted_1",
      },
      {
        key: { isDeleted: 1, isFollowUp: 1, dashboardDomain: 1 },
        name: "isDeleted_1_isFollowUp_1_dashboardDomain_1",
      },
    ],
  },
  {
    collectionName: SurveyResponse.collection.collectionName,
    model: SurveyResponse,
    additionalIndexes: [
      {
        key: { organizationId: 1 },
        name: "organizationId_1",
      },
      {
        key: { status: 1 },
        name: "status_1",
      },
      {
        key: { organizationId: 1, status: 1 },
        name: "organizationId_1_status_1",
      },
      {
        key: { "domainRisks.domain": 1 },
        name: "domainRisks.domain_1",
      },
      {
        key: { "domainRisks.riskCount": 1 },
        name: "domainRisks.riskCount_1",
      },
      {
        key: { completedAt: 1 },
        name: "completedAt_1",
      },
      {
        key: { createdAt: 1 },
        name: "createdAt_1",
      },
    ],
  },
];

function shouldExecute(argv: string[]): boolean {
  return argv.includes("--execute");
}

async function previewMigration(): Promise<void> {
  console.log("OQEP schema migration preview");

  for (const entry of indexedModels) {
    console.log(`- Collection: ${entry.collectionName}`);
    console.log("  - schema indexes from Mongoose model");
    for (const index of entry.additionalIndexes) {
      console.log(`  - additional index: ${index.name}`);
    }
  }

  console.log("");
  console.log("Preview only. No collections or indexes were created.");
  console.log("Run with --execute to apply the migration.");
}

async function ensureCollection(model: Model<any>): Promise<void> {
  try {
    await model.createCollection();
  } catch (error: any) {
    if (error?.codeName === "NamespaceExists") {
      return;
    }

    const message = String(error?.message || "");
    if (message.includes("already exists")) {
      return;
    }

    throw error;
  }
}

async function runMigration(): Promise<void> {
  const dbUrl = process.env.DB_URL?.trim();

  if (!dbUrl) {
    throw new Error("Missing required environment variable: DB_URL");
  }

  await mongoose.connect(dbUrl, buildMongoConnectOptions(dbUrl));

  for (const entry of indexedModels) {
    await ensureCollection(entry.model);
    await entry.model.syncIndexes();

    if (entry.additionalIndexes.length > 0) {
      await entry.model.collection.createIndexes(entry.additionalIndexes);
    }
  }

  console.log("OQEP schema migration completed");
  for (const entry of indexedModels) {
    console.log(`- Ready: ${entry.collectionName}`);
  }
}

async function main(): Promise<void> {
  const execute = shouldExecute(process.argv.slice(2));

  if (!execute) {
    await previewMigration();
    return;
  }

  await runMigration();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
