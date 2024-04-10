import { NftActivityKind, Prisma } from "@prisma/client";
import type { Static } from "elysia";
import Elysia, { t } from "elysia";

import { pagedModel } from "@root/shared/model";
import { CollectionRepository } from "@root/repositories/collection.repository";
import { MRKT_CONTRACT_ADDRESS, X } from "@root/shared/config";

console.log("MRKT: ", X);

const query = t.Composite([
  t.Object({
    type: t.Optional(t.Enum(NftActivityKind)),
    sortByPrice: t.Optional(t.Enum(Prisma.SortOrder))
  }),
  pagedModel
]);

export type GetActivitiesByCollectionQuery = Static<typeof query>;

export const getActivities = new Elysia({
  name: "Controller.Collection.GetActivities"
}).get(
  "",
  () => {
    return CollectionRepository.findByAddress(
      "sei105qjtehd8ex6xkz4e4pr9kyw827gmxacah2ems2amashwsxx785st97dvq"
    );
  },
  { query }
);
