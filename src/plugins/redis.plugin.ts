import Elysia from "elysia";

import { redis } from "@root/shared/redis";

export const redisPlugin = new Elysia({ name: "Plugin.Redis" }).decorate(
  "redis",
  redis
);
