import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * One row per anonymous visitor. The unique IP hash is the server-side
 * uniqueness boundary; raw IP addresses never enter this table.
 */
export const dreamSubmissions = mysqlTable("dream_submissions", {
  id: int("id").autoincrement().primaryKey(),
  ipHash: varchar("ipHash", { length: 64 }).notNull().unique(),
  selectedOptions: text("selectedOptions").notNull(),
  otherText: text("otherText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DreamSubmission = typeof dreamSubmissions.$inferSelect;
export type InsertDreamSubmission = typeof dreamSubmissions.$inferInsert;
