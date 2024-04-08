import Elysia from "elysia";

import { getActivities } from "./collection/get-activities";
import { getOwnedNfs } from "./user/get-owned-nfts";

export const collection = new Elysia({
  name: "Controller.Collection",
  prefix: "collections",
  detail: {
    tags: ["Collection"]
  }
}).use(getActivities);

export const user = new Elysia({
  name: "Controller.User",
  prefix: "users",
  detail: {
    tags: ["User"]
  }
}).use(getOwnedNfs);
