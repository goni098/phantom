import { Prisma } from "@prisma/client";
import type { Static } from "elysia";
import Elysia, { t } from "elysia";

import { pagedModel } from "@root/shared/model";

const query = t.Composite([
  t.Object({
    collectionAddress: t.Optional(t.String({ minLength: 1 })),
    search: t.Optional(t.String()),
    sortByPrice: t.Enum(Prisma.SortOrder),
    marketplace: t.Optional(
      t.Union([t.Literal("all"), t.Literal("mrkt"), t.Literal("pallet")])
    ),
    status: t.Optional(
      t.Union([t.Literal("all"), t.Literal("listed"), t.Literal("owned")])
    )
  }),
  pagedModel
]);

export type GetNftsByOwnerQuery = Static<typeof query>;

export const getOwnedNfs = new Elysia({
  name: "Controller.User.GetOwnedNfts"
}).get(
  "",
  () => {
    // return UserRepository.findAll();
  },
  { query }
);
