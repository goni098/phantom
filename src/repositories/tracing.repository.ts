import type { Prisma, StreamContext } from "@prisma/client";
import { retry } from "ts-retry-promise";

import { cosmosClient } from "@root/shared/cosmos";
import { prisma } from "@root/shared/prisma";

export abstract class TracingRepository {
  public static async createStreamTx(data: Prisma.StreamTxCreateInput) {
    try {
      await prisma.streamTx.create({
        data
      });
    } catch (error) {
      console.error("fail to create stream tx");
      console.error(error);
    }
  }

  public static async createMissingStreamBlock(context: StreamContext) {
    try {
      const block = await retry(() => cosmosClient.getBlock(), {
        retries: 6,
        delay: 0
      });

      await prisma.missingStreamBlock.create({
        data: {
          context,
          height: block.header.height.toString()
        }
      });
    } catch (error) {
      console.error("fail to create missing stream block");
      console.error(error);
    }
  }

  public static findStreamTxByTxHashAndContext({
    context,
    txHash
  }: {
    txHash: string;
    context: StreamContext;
  }) {
    return prisma.streamTx.findFirst({
      where: {
        tx_hash: txHash,
        context
      }
    });
  }
}
