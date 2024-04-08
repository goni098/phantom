import { prisma } from "@root/shared/prisma";

export abstract class UserRepository {
  public static create(walletAddress: string) {
    return prisma.user.create({
      data: {
        address: walletAddress
      }
    });
  }

  public static findByWalletAddress(walletAddress: string) {
    return prisma.user.findUnique({
      where: {
        address: walletAddress
      }
    });
  }

  public static findAll() {
    return prisma.user.findMany({
      select: {
        address: true
      }
    });
  }
}
