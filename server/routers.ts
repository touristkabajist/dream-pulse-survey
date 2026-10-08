import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { OPTION_IDS, countWords, isSurveyOptionId, SurveyOptionId } from "../shared/survey";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getSurveyResults, hasSubmissionForIp, insertDreamSubmission } from "./db";

const submitInput = z.object({
  selectedOptions: z.array(z.string()).min(1).max(OPTION_IDS.length),
  otherText: z.string().optional(),
});

function normalizeIp(address: string) {
  const candidate = address.trim().replace(/^::ffff:/iu, "").split("%")[0] || "unknown";
  if (isIP(candidate) !== 6) return candidate.toLowerCase();

  const [head, tail] = candidate.toLowerCase().split("::");
  const left = head ? head.split(":").filter(Boolean) : [];
  const right = tail ? tail.split(":").filter(Boolean) : [];
  const expanded = [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right]
    .map(part => part.padStart(4, "0"));
  let bestStart = -1;
  let bestLength = 0;
  for (let index = 0; index < expanded.length;) {
    if (expanded[index] !== "0000") { index += 1; continue; }
    const start = index;
    while (index < expanded.length && expanded[index] === "0000") index += 1;
    if (index - start > bestLength) { bestStart = start; bestLength = index - start; }
  }
  const compact = expanded.map(part => part.replace(/^0+(?=\w)/u, ""));
  if (bestLength > 1) {
    compact.splice(bestStart, bestLength, "");
    if (bestStart === 0) compact.unshift("");
    if (bestStart + bestLength === expanded.length) compact.push("");
  }
  return compact.join(":");
}

function getRequestIp(req: { ip?: string; socket?: { remoteAddress?: string } }) {
  return normalizeIp(req.ip || req.socket?.remoteAddress || "unknown");
}

function hashRequestIp(req: Parameters<typeof getRequestIp>[0]) {
  const salt = process.env.IP_HASH_SALT || process.env.MANUS_JWT_SECRET || process.env.DATABASE_URL;
  if (!salt) throw new Error("IP_HASH_SALT is not configured");
  return createHash("sha256").update(`${salt}:${getRequestIp(req)}`).digest("hex");
}

function throwDuplicate() {
  throw new TRPCError({
    code: "CONFLICT",
    message: "This network has already shared a dream. Each visitor may submit only once.",
  });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  survey: router({
    getResults: publicProcedure.query(async ({ ctx }) => {
      const ipHash = hashRequestIp(ctx.req);
      const [results, hasSubmitted] = await Promise.all([getSurveyResults(), hasSubmissionForIp(ipHash)]);
      return {
        available: Boolean(results),
        hasSubmitted,
        counts: results?.counts ?? Object.fromEntries(OPTION_IDS.map(id => [id, 0])),
        otherResponses: results?.otherResponses ?? [],
      };
    }),
    submit: publicProcedure.input(submitInput).mutation(async ({ ctx, input }) => {
      const selectedOptions = Array.from(new Set(input.selectedOptions));
      if (selectedOptions.some(option => !isSurveyOptionId(option))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Please choose a valid dream sense." });
      }

      const typedOptions = selectedOptions as SurveyOptionId[];
      const includesOther = typedOptions.includes("other");
      const otherText = input.otherText ?? "";
      if (includesOther && !otherText.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tell us a little more when you choose Other." });
      }
      if (countWords(otherText) > 100) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Other responses must be 100 words or fewer." });
      }
      if (otherText.length > 800 || Buffer.byteLength(otherText, "utf8") > 4000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Other responses must be 800 characters or fewer." });
      }
      if (!includesOther && otherText.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only send Other text when Other is selected." });
      }

      let ipHash: string;
      try {
        ipHash = hashRequestIp(ctx.req);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Anonymous submission protection is not configured." });
      }
      if (await hasSubmissionForIp(ipHash)) throwDuplicate();

      try {
        await insertDreamSubmission({
          ipHash,
          selectedOptions: typedOptions,
          otherText: includesOther ? otherText : undefined,
        });
      } catch (error) {
        const dbError = error as { code?: string; errno?: number };
        if (dbError.code === "ER_DUP_ENTRY" || dbError.errno === 1062) throwDuplicate();
        console.error("[Survey] Failed to save submission:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "We could not save that response. Please try again." });
      }

      const results = await getSurveyResults();
      return {
        success: true,
        counts: results?.counts ?? Object.fromEntries(OPTION_IDS.map(id => [id, 0])),
        otherResponses: results?.otherResponses ?? [],
      } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
