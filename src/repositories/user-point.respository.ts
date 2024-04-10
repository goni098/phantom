import type { LoyaltyPointKind } from "@prisma/client";
import type { DateTime } from "luxon";

import { prisma } from "@root/shared/prisma";

type GetLeaderBoardByDateParams = {
  from: DateTime;
  end: DateTime;
  take: number;
  page: number;
};

type GetUserLeaderBoardByDateParams = {
  from: DateTime;
  end: DateTime;
  wallet_address: string;
};

type RawLeaderboard = Array<{
  wallet_address: string;
  point: bigint | number;
  rank: bigint | number;
}>;

type CreateUserPointParams = {
  date: DateTime;
  kind: LoyaltyPointKind;
  walletAddress: string;
  point: number;
};

export abstract class UserPointRepository {
  public static createUserPoint({
    date,
    kind,
    walletAddress,
    point
  }: CreateUserPointParams) {
    return prisma.userLoyaltyPoint.create({
      data: {
        date: date.toJSDate(),
        kind,
        point,
        wallet_address: walletAddress
      }
    });
  }

  public static async getLeaderBoardByDate({
    end,
    from,
    page,
    take
  }: GetLeaderBoardByDateParams) {
    // const totalRaw = await prisma.$runCommandRaw`
    //     SELECT count(*) FROM (
    //         SELECT DISTINCT wallet_address FROM public static.user_loyalty_point "u"
    //         WHERE "u"."date" >= ${from.toJSDate()} AND "u"."date" < ${end.toJSDate()} AND "u"."point" > 0
    //   ) AS temp;
    // `;
    // const loyalty_point = await prisma.$queryRaw<RawLeaderboard>`
    //     SELECT
    //         "u"."wallet_address",
    //         sum("u"."point") "point",
    //         rank() OVER (ORDER BY sum("u"."point") DESC)
    //     FROM "public static"."user_loyalty_point" "u"
    //     WHERE "u"."date" >= ${from.toJSDate()} AND "u"."date" < ${end.toJSDate()}
    //       AND "u"."point" > 0
    //       AND "u"."kind" != 'xp'
    //     GROUP BY wallet_address
    //     ORDER BY sum("u"."point") DESC
    //     LIMIT ${take}
    //     OFFSET ${(page - 1) * take}
    // `;
    // const leaderboard = loyalty_point.map(user => ({
    //   wallet_address: user.wallet_address,
    //   point: Number(user.point.toString()),
    //   rank: Number(user.rank.toString())
    // }));
    // const total = Number(totalRaw?.[0].count.toString()) || 0;
    // return { leaderboard, total };
  }

  public static async getUserOnLeaderBoard({
    end,
    from,
    wallet_address
  }: GetUserLeaderBoardByDateParams) {
    // const totalRaw = await prisma.$queryRaw<[{ count: bigint }]>`
    //     SELECT count(*) FROM (
    //         SELECT DISTINCT wallet_address FROM public static.user_loyalty_point "u"
    //         WHERE "u"."date" >= ${from.toJSDate()} AND "u"."date" < ${end.toJSDate()} AND "u"."point" > 0
    //   ) AS temp;`;
    // const raw = await prisma.$queryRaw<RawLeaderboard>`
    //     SELECT * FROM(
    //         SELECT
    //             "u"."wallet_address",
    //             sum("u"."point") "point",
    //             rank() OVER (ORDER BY sum("u"."point") DESC)
    //         FROM "public static"."user_loyalty_point" "u"
    //         WHERE "u"."date" >= ${from.toJSDate()} AND "u"."date" < ${end.toJSDate()} AND "u"."point" > 0 AND "u"."kind" != 'xp'
    //         GROUP BY wallet_address
    //     ) tmp
    //     WHERE wallet_address = ${wallet_address}
    // `;
    // if (raw.length) {
    //   const user = raw[0];
    //   return {
    //     rank: {
    //       wallet_address: user.wallet_address,
    //       point: Number(user.point.toString()),
    //       rank: Number(user.rank.toString())
    //     }
    //   };
    // }
    // return {
    //   rank: {
    //     wallet_address,
    //     point: 0,
    //     rank: 1 + Number(totalRaw?.[0].count.toString()) || 0
    //   }
    // };
  }
}
