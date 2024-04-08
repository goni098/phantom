import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

console.log("set up prisma");

const logFeatureFlag = process.env.LOG_QUERY;

const log: Prisma.LogLevel[] = ["error", "warn"];

if (logFeatureFlag) {
  log.push("query", "info");
}

const prismaClient = new PrismaClient<Prisma.PrismaClientOptions, "query">({
  log,
  errorFormat: "pretty"
});

if (logFeatureFlag) {
  prismaClient.$on("query", e => {
    console.log("Params: " + e.params);
  });
}

export const prisma = prismaClient;
