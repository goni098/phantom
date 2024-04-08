import { bearer } from "@elysiajs/bearer";
import Elysia from "elysia";

import { UnauthorizedError } from "@root/errors/UnauthorizedError";

import type { Claims } from "../types/Claims";
import { accessJwt } from "./jwt.plugin";

export const authPlugin = new Elysia({
  name: "Plugin.Auth"
})
  .use(bearer())
  .use(accessJwt)
  .derive(async ({ bearer, jwt }) => {
    const claims = (await jwt.verify(bearer)) as Claims | false;

    if (!claims) {
      throw new UnauthorizedError();
    }

    return {
      claims
    };
  });
