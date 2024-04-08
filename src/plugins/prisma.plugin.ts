import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import Elysia from "elysia";

const client = () => {
  const logFeatureFlag = process.env.LOG_QUERY;

  const log: Prisma.LogLevel[] = ["error", "warn"];

  if (logFeatureFlag) {
    log.push("query", "info");
  }

  const prisma = new PrismaClient<Prisma.PrismaClientOptions, "query">({
    log,
    errorFormat: "pretty"
  });

  if (logFeatureFlag) {
    prisma.$on("query", e => {
      console.log("Params: " + e.params);
    });
  }

  return prisma;
};

export const prismaPlugin = new Elysia({ name: "Plugin.Prisma" }).decorate(
  "prisma",
  client()
);
