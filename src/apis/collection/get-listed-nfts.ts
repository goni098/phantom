import { Prisma } from "@prisma/client";
import type { Static } from "elysia";
import Elysia, { t } from "elysia";

import { pagedModel } from "@root/shared/model";

const query = t.Composite([
  t.Object({
    sortByPrice: t.Optional(t.Enum(Prisma.SortOrder)),
    search: t.Optional(t.String())
  }),
  pagedModel
]);

export type GetListedNftsByCollectionQuery = Static<typeof query>;

export const getListedNfts = new Elysia().get("", () => {}, { query });
