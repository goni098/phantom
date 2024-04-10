import type { Prisma } from "@prisma/client";
import { DateTime } from "luxon";

import type { GetActivitiesByCollectionQuery } from "@root/apis/collection/get-activities";
import type { GetListedNftsByCollectionQuery } from "@root/apis/collection/get-listed-nfts";
import type { GetCollectionOffersQuery } from "@root/apis/collection/get-offers";
import type { GetCollectionsStats } from "@root/apis/collection/get-stats";
import { sortMapping } from "@root/apis/collection/get-stats";
import { prisma } from "@root/shared/prisma";

import type { Offer as CollectionOffer } from "../services/query-contract/mrkt-contract-query.service";

type CreateCollectionParams = {
  address: string;
  name: string;
  symbol: string;
  supply: number;
  description?: string;
  royalty?: number;
  image?: string;
  banner?: string;
  socials?: Array<Record<string, string>>;
};

type CreateCollectionOfferParams = {
  txHash: string;
  createdDate: DateTime;
  offer: CollectionOffer;
};

type FindPagedCollectionParams = {
  take: number;
  page: number;
  ownerAddress: string;
  search?: string;
};

type DeleteCollectionOfferIfExistParams = {
  buyerAddress: string;
  collectionAddress: string;
  price: number;
};

export abstract class CollectionRepository {
  public static create({
    address,
    name,
    symbol,
    description,
    banner,
    image,
    royalty,
    supply,
    socials
  }: CreateCollectionParams) {
    return prisma.collection.create({
      data: {
        address,
        name,
        symbol,
        description,
        banner,
        image,
        royalty,
        supply,
        socials
      }
    });
  }

  public static findByAddress(address: string) {
    return prisma.collection.findUnique({
      where: {
        address
      }
    });
  }

  public static findAllCollectionAddress() {
    return prisma.collection.findMany({
      select: {
        address: true
      }
    });
  }

  public static createCollectionOffer({
    offer,
    txHash,
    createdDate
  }: CreateCollectionOfferParams) {
    const startDate = DateTime.fromSeconds(offer.duration.start);
    const endDate = DateTime.fromSeconds(offer.duration.end);

    return prisma.collectionOffer.upsert({
      create: {
        tx_hash: txHash,
        collection_address: offer.cw721_address,
        end_date: endDate.toJSDate(),
        price: Number(offer.price),
        quantity: offer.quantity,
        denom: offer.denom.native,
        start_date: startDate.toJSDate(),
        created_date: createdDate.toJSDate(),
        buyer_address: offer.buyer
      },
      update: {
        tx_hash: txHash,
        collection_address: offer.cw721_address,
        end_date: endDate.toJSDate(),
        price: Number(offer.price),
        quantity: offer.quantity,
        denom: offer.denom.native,
        start_date: startDate.toJSDate(),
        created_date: createdDate.toJSDate(),
        buyer_address: offer.buyer
      },
      where: {
        collection_address_buyer_address_price: {
          buyer_address: offer.buyer,
          collection_address: offer.cw721_address,
          price: Number(offer.price)
        }
      }
    });
  }

  public static deleteCollectionOfferIfExist({
    buyerAddress,
    collectionAddress,
    price
  }: DeleteCollectionOfferIfExistParams) {
    return prisma.collectionOffer.deleteMany({
      where: {
        collection_address: collectionAddress,
        buyer_address: buyerAddress,
        price
      }
    });
  }

  public static async findPagedCollectionOffers(
    collectionAddress: string,
    { page, take, walletAddress }: GetCollectionOffersQuery
  ) {
    const [nodes, total] = await Promise.all([
      prisma.collectionOffer.findMany({
        where: {
          collection_address: collectionAddress,
          buyer_address: walletAddress
        },
        take,
        skip: (page - 1) * take
      }),
      prisma.collectionOffer.count({
        where: {
          collection_address: collectionAddress,
          buyer_address: walletAddress
        }
      })
    ]);

    return { nodes, total };
  }

  public static findHighestCollectionOfferExcludeSelfOffer(
    collectionAddress: string,
    excludeBuyer: string
  ) {
    return prisma.collectionOffer.findFirst({
      where: {
        collection_address: collectionAddress,
        buyer_address: {
          not: excludeBuyer // exclude their owned offers
        },
        start_date: {
          lte: DateTime.now().toJSDate()
        },
        end_date: {
          gt: DateTime.now().toJSDate()
        }
      },
      orderBy: {
        price: "desc"
      },
      take: 1
    });
  }

  public static updateCollectionOffer(offer: CollectionOffer) {
    return prisma.collectionOffer.updateMany({
      where: {
        collection_address: offer.cw721_address,
        buyer_address: offer.buyer,
        price: Number(offer.price)
      },
      data: {
        current_quantity: offer.num_accepted,
        quantity: offer.quantity
      }
    });
  }

  public static async findPagedListedNftsByCollectionAddress(
    collectionAddress: string,
    { page, take, sortByPrice, search }: GetListedNftsByCollectionQuery
  ) {
    const filter: Prisma.ListingNftWhereInput = {
      market: "mrkt",
      Nft: {
        token_address: collectionAddress
      }
    };

    if (search) {
      filter.Nft!.OR = [
        {
          name: {
            contains: search,
            mode: "insensitive"
          }
        },
        {
          token_id: {
            contains: search,
            mode: "insensitive"
          }
        }
      ];
    }

    const [listings, total] = await Promise.all([
      prisma.listingNft.findMany({
        where: filter,
        include: {
          Nft: true
        },
        take,
        skip: (page - 1) * take,
        orderBy: [
          {
            price: sortByPrice
          },
          {
            start_date: "desc"
          }
        ]
      }),
      prisma.listingNft.count({
        where: filter
      })
    ]);

    return { listings, total };
  }

  // mean collections that user has nfts on it
  public static async findPagedCollectionsByUser({
    page,
    take,
    ownerAddress,
    search
  }: FindPagedCollectionParams) {
    const addresses =
      await this.findAllCollectionAddressesThatUserHasNft(ownerAddress);

    const [collections, total] = await Promise.all([
      prisma.collectionView.findMany({
        select: {
          image: true,
          name: true,
          floor_price: true,
          address: true
        },
        where: {
          name: {
            contains: search,
            mode: "insensitive"
          },
          address: {
            in: addresses
          }
        },
        take,
        skip: (page - 1) * take
      }),
      prisma.collection.count({
        where: {
          name: {
            contains: search,
            mode: "insensitive"
          },
          address: {
            in: addresses
          }
        }
      })
    ]);

    const collectionsWithEstValue = await Promise.all(
      collections.map(async collection => {
        const totalOwned = await prisma.nft.count({
          where: {
            token_address: collection.address,
            OR: [
              { owner_address: ownerAddress },
              {
                Listing: {
                  seller_address: ownerAddress
                }
              }
            ]
          }
        });

        const totalListed = await prisma.listingNft.count({
          where: {
            Nft: {
              token_address: collection.address
            },
            seller_address: ownerAddress
          }
        });

        const value = totalOwned * collection.floor_price;

        return {
          ...collection,
          total_listed: totalListed,
          total: totalOwned,
          value
        };
      })
    );

    return {
      collections: collectionsWithEstValue,
      total
    };
  }

  public static async findPagedActivitiesByCollection(
    collectionAddress: string,
    { page, take, sortByPrice, type }: GetActivitiesByCollectionQuery
  ) {
    let sort: Prisma.NftActivityOrderByWithRelationInput[] = [];
    const filter: Prisma.NftActivityWhereInput = {
      Nft: {
        token_address: collectionAddress
      }
    };

    if (type) {
      filter.event_kind = type;
    }

    if (sortByPrice) {
      sort = [{ price: sortByPrice }, { id: "desc" }];
    } else {
      sort = [{ id: "desc" }];
    }

    const [activities, total] = await Promise.all([
      prisma.nftActivity.findMany({
        where: filter,
        include: {
          Nft: {
            select: {
              token_address: true,
              token_id: true,
              token_uri: true,
              image: true,
              name: true
            }
          }
        },
        take,
        skip: (page - 1) * take,
        orderBy: sort
      }),
      prisma.nftActivity.count({
        where: filter
      })
    ]);

    return { activities, total };
  }

  public static async findEstValueByUser(walletAddress: string) {
    const addresses =
      await this.findAllCollectionAddressesThatUserHasNft(walletAddress);

    const collections = await prisma.collectionView.findMany({
      where: {
        address: {
          in: addresses
        }
      },
      select: {
        address: true,
        floor_price: true
      }
    });

    const values = await Promise.all(
      collections.map(async collection => {
        const totalOwned = await prisma.nft.count({
          where: {
            token_address: collection.address,
            OR: [
              {
                owner_address: walletAddress
              },
              {
                Listing: {
                  seller_address: walletAddress
                }
              }
            ]
          }
        });

        const value = totalOwned * collection.floor_price;

        return value;
      })
    );

    const est_value = values.reduce((sum, val) => sum + val, 0);

    return {
      collections: addresses.length,
      est_value
    };
  }

  public static async findPagedCollectionsStats({
    page,
    take,
    sort,
    sortDirection,
    search
  }: GetCollectionsStats) {
    const filter: Prisma.CollectionViewWhereInput = {};

    if (search) {
      filter.name = {
        contains: search,
        mode: "insensitive"
      };
    }

    const selectedVolume = sortMapping(sort);

    const [collections, total] = await Promise.all([
      prisma.collectionView.findMany({
        select: {
          address: true,
          image: true,
          banner: true,
          floor_price: true,
          sales: true,
          volume: true,
          volume_of_24h: true,
          listed: true,
          supply: true,
          name: true,
          [selectedVolume]: true
        },
        where: filter,
        take,
        skip: (page - 1) * take,
        orderBy: {
          [selectedVolume]: sortDirection
        }
      }),
      prisma.collection.count({
        where: filter as Prisma.CollectionWhereInput
      })
    ]);

    const collectionsWithStats = await Promise.all(
      collections.map(async c => {
        const snapshotAt24hAgo = await prisma.collectionSnapshot.findFirst({
          where: {
            collection_address: c.address,
            date: {
              lte: DateTime.now().minus({ day: 1 }).toJSDate()
            }
          },
          orderBy: {
            date: "desc"
          },
          take: 1
        });

        const floorAt24hAgo = snapshotAt24hAgo?.floor || 0;
        const _24hVolAt24hAgo = snapshotAt24hAgo?.volume_of_24h || 0;

        const c24h_volume_change =
          floorAt24hAgo === 0
            ? 0
            : ((Number(c.volume_of_24h) - _24hVolAt24hAgo) / _24hVolAt24hAgo) *
              100;

        const c24h_floor_change =
          floorAt24hAgo === 0
            ? 0
            : ((Number(c.floor_price) - floorAt24hAgo) / floorAt24hAgo) * 100;

        return {
          ...c,
          c24h_volume_change,
          c24h_floor_change
        };
      })
    );

    return { collectionsWithStats, total };
  }

  private static async findAllCollectionAddressesThatUserHasNft(
    walletAddress: string
  ) {
    const collections = await prisma.collection.findMany({
      where: {
        Nfts: {
          some: {
            OR: [
              { owner_address: walletAddress },
              {
                Listing: {
                  seller_address: walletAddress
                }
              }
            ]
          }
        }
      }
    });

    return collections.map(({ address }) => address);
  }
}
