import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { dreamSubmissions, InsertUser, users } from "../drizzle/schema";
import { OPTION_IDS, isSurveyOptionId, SurveyOptionId } from "../shared/survey";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];

  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };

  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export type SurveyResults = {
  counts: Record<SurveyOptionId, number>;
  otherResponses: string[];
};

const emptyCounts = (): Record<SurveyOptionId, number> =>
  Object.fromEntries(OPTION_IDS.map(optionId => [optionId, 0])) as Record<SurveyOptionId, number>;

export async function hasSubmissionForIp(ipHash: string) {
  const db = await getDb();
  if (!db) return false;
  const existing = await db
    .select({ id: dreamSubmissions.id })
    .from(dreamSubmissions)
    .where(eq(dreamSubmissions.ipHash, ipHash))
    .limit(1);
  return existing.length > 0;
}

export async function getSurveyResults(): Promise<SurveyResults | null> {
  const db = await getDb();
  if (!db) return null;

  const counts = emptyCounts();
  const otherResponses: string[] = [];
  const rows = await db
    .select({ selectedOptions: dreamSubmissions.selectedOptions, otherText: dreamSubmissions.otherText })
    .from(dreamSubmissions)
    .orderBy(desc(dreamSubmissions.createdAt));

  for (const row of rows) {
    let selectedOptions: unknown;
    try {
      selectedOptions = JSON.parse(row.selectedOptions);
    } catch {
      selectedOptions = [];
    }

    if (Array.isArray(selectedOptions)) {
      for (const option of selectedOptions) {
        if (typeof option === "string" && isSurveyOptionId(option)) counts[option] += 1;
      }
    }
    if (row.otherText) otherResponses.push(row.otherText);
  }

  return { counts, otherResponses };
}

export async function insertDreamSubmission(input: {
  ipHash: string;
  selectedOptions: SurveyOptionId[];
  otherText?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  await db.insert(dreamSubmissions).values({
    ipHash: input.ipHash,
    selectedOptions: JSON.stringify(input.selectedOptions),
    otherText: input.otherText || null,
  });
}
