import type { CollectionView } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { Static } from "elysia";
import { t } from "elysia";

import { pagedModel } from "@root/shared/model";

const query = t.Composite([
  t.Object({
    search: t.Optional(t.String()),
    sort: t.Optional(
      t.Union([
        t.Literal("1h"),
        t.Literal("24h"),
        t.Literal("7d"),
        t.Literal("30d"),
        t.Literal("all")
      ])
    ),
    sortDirection: t.Optional(t.Enum(Prisma.SortOrder))
  }),
  pagedModel
]);

export type GetCollectionsStats = Static<typeof query>;

export const sortMapping = (
  sort: GetCollectionsStats["sort"]
): Extract<
  keyof CollectionView,
  "volume_of_30d" | "volume_of_7d" | "volume_of_24h" | "volume_of_1h" | "volume"
> => {
  switch (sort) {
    case "30d":
      return "volume_of_30d";

    case "7d":
      return "volume_of_7d";

    case "24h":
      return "volume_of_24h";

    case "1h":
      return "volume_of_1h";

    case "all":
      return "volume";

    default:
      return "volume_of_24h";
  }
};
