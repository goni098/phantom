import { NftActivityKind, Prisma } from "@prisma/client";
import type { Static } from "elysia";
import { t } from "elysia";

import { pagedModel } from "@root/shared/model";

const query = t.Composite([
  t.Object({
    search: t.Optional(t.String()),
    type: t.Optional(t.Enum(NftActivityKind)),
    sortByPrice: t.Optional(t.Enum(Prisma.SortOrder))
  }),
  pagedModel
]);

export type GetActivitiesByUserQuery = Static<typeof query>;
