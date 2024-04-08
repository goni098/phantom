import type { Static } from "elysia";
import { t } from "elysia";

import { pagedModel } from "@root/shared/model";

const query = t.Composite([
  t.Object({
    walletAddress: t.Optional(t.String({ minLength: 1 }))
  }),
  pagedModel
]);
export type GetCollectionOffersQuery = Static<typeof query>;
