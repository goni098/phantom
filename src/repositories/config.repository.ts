import { prisma } from "@root/shared/prisma";

type Config = "current_height";

export abstract class ConfigRepository {
  public static async get(key: Config) {
    const config = await prisma.config.findFirst({
      where: {
        key
      }
    });

    return config?.value;
  }

  public static set(key: Config, value: string) {
    return prisma.config.update({
      where: {
        key
      },
      data: {
        value
      }
    });
  }

  public static upset(key: Config, value: string) {
    return prisma.config.upsert({
      where: {
        key
      },
      create: {
        key,
        value
      },
      update: {
        value
      }
    });
  }
}
