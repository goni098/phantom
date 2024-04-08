import swagger from "@elysiajs/swagger";
import { Elysia } from "elysia";

import { collection, user } from "./apis";
import { errorPlugin } from "./plugins/error.plugin";

const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: "Sei NFTs marketplace APIs documentation",
          version: "1.0.50"
        }
      }
    })
  )
  .use(collection)
  .use(user)
  .use(errorPlugin)
  .listen(8080);

console.log(
  `🦊 Sei NFTs marketplace is running at ${app.server?.hostname}:${app.server?.port}`
);
