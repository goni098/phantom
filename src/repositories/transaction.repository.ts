import type { Marketplace } from "@prisma/client";
import type { DateTime } from "luxon";

import { prisma } from "@root/shared/prisma";

type CreateTransactionParams = {
  txHash: string;
  volume: number;
  collection_address: string;
  buyerAddress: string;
  sellerAddress: string;
  createdDate: DateTime;
  marketplace?: Marketplace;
};

export class TransactionRepository {
  public static create({
    txHash,
    volume,
    collection_address,
    buyerAddress,
    sellerAddress,
    createdDate,
    marketplace
  }: CreateTransactionParams) {
    return prisma.transaction.create({
      data: {
        date: createdDate.toJSDate(),
        txn_hash: txHash,
        volume,
        buyer_address: buyerAddress,
        seller_address: sellerAddress,
        market: marketplace,
        Collection: {
          connect: {
            address: collection_address
          }
        }
      }
    });
  }
}
