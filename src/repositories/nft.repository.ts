import type {
  ListingNft,
  Marketplace,
  NftActivityKind,
  Prisma
} from "@prisma/client";
import type { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { DateTime } from "luxon";

import type { GetActivitiesByUserQuery } from "@root/apis/user/get-activities";
import type { GetNftsByOwnerQuery } from "@root/apis/user/get-owned-nfts";
import { prisma } from "@root/shared/prisma";

import type { NftAttribute } from "../services/http/get-nft-metadata";
import type {
  Offer as NftOffer,
  Sale
} from "../services/query-contract/mrkt-contract-query.service";
import type { PalletListingResponse } from "../services/query-contract/pallet-contract-query.service";

type FindNftByTokenAddressAndTokenIdParams = {
  tokenAddress: string;
  tokenId: string;
  withListing?: boolean;
};

type CreateNftParams = {
  tokenId: string;
  tokenUri: string;
  collection: {
    address: string;
  };
  name?: string;
  image?: string;
  traits?: Array<NftAttribute>;
  description?: string;
  ownerAddress?: string;
};

type CreateMrktNftListingParams = {
  nft_id: number;
  txHash: string;
  createdDate: DateTime;
  sale: Sale;
};

type CreatePalletNftListingParams = {
  nft_id: number;
  txHash: string;
  palletListingResponse: PalletListingResponse;
  denom: string;
  amount: number;
};

type CreateNftOfferParams = {
  nft_id: number; // id in database
  txHash: string;
  createdDate: DateTime;
  offer: NftOffer;
};

type CreateNftActivityParams = {
  txHash: string;
  price: number;
  denom: string;
  eventKind: NftActivityKind;
  metadata: Prisma.InputJsonValue;
  nft_id: number;
  createdDate: DateTime;
  sellerAddress?: string;
  buyerAddress?: string;
  marketplace?: Marketplace;
};

type CreateNftBiddingParams = {
  listing: ListingNft;
  buyerAddress: string;
  price: number;
  txHash: string;
  createdDate: DateTime;
};

type UpdateNftListingParams = {
  listing: ListingNft;
  price?: number;
  minBidIncrementPercent?: number;
};

type UpdateOwnerParams = {
  tokenAddress: string;
  tokenId: string;
  ownerAddress: string;
};

type DeleteNftOfferIfExistParams = {
  buyerAddress: string;
  tokenAddress: string;
  tokenId: string;
  price: number;
};

type DeleteListingIfExistParams = {
  tokenAddress: string;
  tokenId: string;
  marketplace?: Marketplace;
};

export abstract class NftRepository {
  public static async findByAddressAndTokenId({
    tokenAddress,
    tokenId,
    withListing = false
  }: FindNftByTokenAddressAndTokenIdParams) {
    const nft = await prisma.nft.findUnique({
      where: {
        token_address_token_id: {
          token_address: tokenAddress,
          token_id: tokenId
        }
      },
      include: {
        Listing: withListing
      }
    });

    return nft;
  }

  public static async createNft({
    collection,
    image,
    name,
    traits = [],
    description,
    tokenId,
    tokenUri,
    ownerAddress
  }: CreateNftParams) {
    try {
      const nft = await prisma.nft.create({
        data: {
          name,
          token_address: collection.address,
          token_id: tokenId,
          token_uri: tokenUri,
          description,
          image,
          owner_address: ownerAddress,
          Traits: {
            createMany: {
              data: traits.map(({ trait_type, value, display_type, type }) => ({
                attribute: trait_type || type || "unknown",
                value: value?.toString() || "unknown",
                display_type
              }))
            }
          }
        }
      });

      return nft;
    } catch (error) {
      // sometime this method runs at the same time from different streams it will throw unique constraint error
      // upsert Prisma method use select and insert under the hood not insert on conflict instead
      // so it dose not resolve this problem

      // this unique constraint error's code
      if ((error as PrismaClientKnownRequestError).code !== "P2002") {
        throw error;
      }

      const nft = await prisma.nft.findUnique({
        where: {
          token_address_token_id: {
            token_address: collection.address,
            token_id: tokenId
          }
        }
      });

      if (!nft) {
        throw new Error("unexpected nft not found from P2002 error");
      }

      return nft;
    }
  }

  public static createMrktNftListing({
    nft_id,
    txHash,
    createdDate,
    sale
  }: CreateMrktNftListingParams) {
    let startDate: DateTime | undefined = undefined;
    let endDate: DateTime | undefined = undefined;

    if (sale.duration_type !== "Fixed") {
      const [start, end] = sale.duration_type.Time;
      startDate = DateTime.fromSeconds(start);
      endDate = DateTime.fromSeconds(end);
    }

    return prisma.listingNft.upsert({
      create: {
        denom: sale.denom.native,
        sale_type: sale.sale_type === "Fixed" ? "fixed" : "auction",
        tx_hash: txHash,
        created_date: createdDate.toJSDate(),
        end_date: endDate?.toJSDate(),
        start_date: startDate?.toJSDate(),
        min_bid_increment_percent: sale.min_bid_increment_percent,
        price: Number(sale.initial_price),
        collection_address: sale.cw721_address,
        seller_address: sale.provider,
        Nft: {
          connect: {
            id: nft_id
          }
        }
      },
      update: {
        denom: sale.denom.native,
        sale_type: sale.sale_type === "Fixed" ? "fixed" : "auction",
        tx_hash: txHash,
        created_date: createdDate.toJSDate(),
        end_date: endDate?.toJSDate(),
        start_date: startDate?.toJSDate(),
        min_bid_increment_percent: sale.min_bid_increment_percent,
        price: Number(sale.initial_price),
        collection_address: sale.cw721_address,
        seller_address: sale.provider
      },
      where: {
        nft_id
      }
    });
  }

  public static createPalletNftListing({
    nft_id,
    palletListingResponse,
    txHash,
    amount,
    denom
  }: CreatePalletNftListingParams) {
    const palletListing = palletListingResponse.auction;

    if (!palletListing) {
      return;
    }

    return prisma.listingNft.upsert({
      create: {
        market: "pallet",
        denom,
        sale_type: "fixed",
        tx_hash: txHash,
        created_date: DateTime.fromSeconds(palletListing.created_at).toJSDate(),
        expiration_time: palletListing.expiration_time,
        price: Number(amount),
        collection_address: palletListingResponse.nft_address,
        seller_address: palletListingResponse.owner,
        Nft: {
          connect: {
            id: nft_id
          }
        }
      },
      update: {
        market: "pallet",
        denom,
        sale_type: "fixed",
        created_date: DateTime.fromSeconds(palletListing.created_at).toJSDate(),
        expiration_time: palletListing.expiration_time,
        price: Number(amount),
        collection_address: palletListingResponse.nft_address,
        seller_address: palletListingResponse.owner,
        Nft: {
          connect: {
            id: nft_id
          }
        }
      },
      where: {
        nft_id,
        market: "pallet"
      }
    });
  }

  public static createNftOffer({
    nft_id,
    txHash,
    createdDate,
    offer
  }: CreateNftOfferParams) {
    const startDate = DateTime.fromSeconds(offer.duration.start);
    const endDate = DateTime.fromSeconds(offer.duration.end);

    return prisma.nftOffer.upsert({
      create: {
        nft_id,
        tx_hash: txHash,
        denom: offer.denom.native,
        price: Number(offer.price),
        buyer_address: offer.buyer,
        end_date: endDate.toJSDate(),
        start_date: startDate.toJSDate(),
        created_date: createdDate.toJSDate()
      },
      where: {
        nft_id_buyer_address_price: {
          nft_id,
          buyer_address: offer.buyer,
          price: Number(offer.price)
        }
      },
      update: {
        tx_hash: txHash,
        denom: offer.denom.native,
        price: Number(offer.price),
        buyer_address: offer.buyer,
        end_date: endDate.toJSDate(),
        start_date: startDate.toJSDate(),
        created_date: createdDate.toJSDate()
      }
    });
  }

  public static deleteNftOfferIfExist({
    buyerAddress,
    price,
    tokenAddress,
    tokenId
  }: DeleteNftOfferIfExistParams) {
    return prisma.nftOffer.deleteMany({
      where: {
        Nft: {
          token_address: tokenAddress,
          token_id: tokenId
        },
        price,
        buyer_address: buyerAddress
      }
    });
  }

  public static createNftActivity({
    denom,
    metadata,
    price,
    eventKind,
    nft_id,
    txHash,
    sellerAddress,
    buyerAddress,
    createdDate,
    marketplace
  }: CreateNftActivityParams) {
    return prisma.nftActivity.create({
      data: {
        denom,
        event_kind: eventKind,
        seller_address: sellerAddress,
        metadata,
        price,
        tx_hash: txHash,
        buyer_address: buyerAddress,
        date: createdDate.toJSDate(),
        market: marketplace,
        Nft: {
          connect: {
            id: nft_id
          }
        }
      }
    });
  }

  public static createNftBidding({
    buyerAddress,
    listing,
    price,
    txHash,
    createdDate
  }: CreateNftBiddingParams) {
    return prisma.nftBidding.create({
      data: {
        buyer_address: buyerAddress,
        denom: listing.denom,
        price,
        tx_hash: txHash,
        listing_id: listing.id,
        created_date: createdDate.toJSDate()
      }
    });
  }

  public static deleteNftBidding(buyerAddress: string, listing: ListingNft) {
    return prisma.nftBidding.deleteMany({
      where: {
        buyer_address: buyerAddress,
        listing_id: listing.id
      }
    });
  }

  public static updateListing({
    listing,
    minBidIncrementPercent,
    price
  }: UpdateNftListingParams) {
    return prisma.listingNft.update({
      where: {
        id: listing.id
      },
      data: {
        min_bid_increment_percent: minBidIncrementPercent,
        price
      }
    });
  }

  public static deleteListingIfExist({
    tokenAddress,
    tokenId,
    marketplace
  }: DeleteListingIfExistParams) {
    return prisma.listingNft.deleteMany({
      where: {
        Nft: {
          token_address: tokenAddress,
          token_id: tokenId
        },
        market: marketplace
      }
    });
  }

  public static findListingsBySellerAddress(sellerAddress: string) {
    return prisma.listingNft.findMany({
      where: {
        seller_address: sellerAddress
      },
      include: {
        Nft: true
      }
    });
  }

  public static updateOwner({
    ownerAddress,
    tokenAddress,
    tokenId
  }: UpdateOwnerParams) {
    return prisma.nft.update({
      data: {
        owner_address: ownerAddress
      },
      where: {
        token_address_token_id: {
          token_address: tokenAddress,
          token_id: tokenId
        }
      }
    });
  }

  public static async findPagedNftsByOwner(
    ownerAddress: string,
    {
      page,
      sortByPrice,
      status,
      take,
      search,
      collectionAddress,
      marketplace
    }: GetNftsByOwnerQuery
  ) {
    const filter: Prisma.NftWhereInput = {};

    if (collectionAddress) {
      filter.token_address = collectionAddress;
    }

    if (search) {
      filter.AND = {
        OR: [
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
        ]
      };
    }

    const market = marketplace === "all" ? undefined : marketplace;

    if (status === "all") {
      filter.OR = [
        { owner_address: ownerAddress },
        {
          Listing: {
            seller_address: ownerAddress,
            market
          }
        }
      ];
    } else if (status === "listed") {
      filter.Listing = {
        seller_address: ownerAddress,
        market
      };
    } else {
      filter.owner_address = ownerAddress;
    }

    const [nfts, total] = await Promise.all([
      prisma.nft.findMany({
        where: filter,
        include: {
          Listing: true,
          Collection: {
            select: {
              royalty: true
            }
          }
        },
        take,
        skip: (page - 1) * take,
        orderBy: [
          {
            Listing: {
              price: sortByPrice
            }
          },
          {
            id: "desc"
          }
        ]
      }),
      prisma.nft.count({
        where: filter
      })
    ]);

    return { nfts, total };
  }

  public static async findPagedActivitiesByUser(
    walletAddress: string,
    { page, sortByPrice, take, type, search }: GetActivitiesByUserQuery
  ) {
    const filter: Prisma.NftActivityWhereInput = {
      OR: [
        {
          buyer_address: walletAddress
        },
        {
          seller_address: walletAddress
        }
      ]
    };

    let orderBy: Prisma.NftActivityOrderByWithRelationInput[] = [
      {
        date: "desc"
      },
      {
        id: "desc"
      }
    ];

    if (type) {
      filter.event_kind = type;
    }

    if (search) {
      filter.Nft = {
        OR: [
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
        ]
      };
    }

    if (sortByPrice) {
      orderBy = [
        {
          price: sortByPrice
        },
        {
          id: "desc"
        }
      ];
    }

    const [activities, total] = await Promise.all([
      prisma.nftActivity.findMany({
        where: filter,
        include: {
          Nft: {
            select: {
              token_address: true,
              token_id: true,
              image: true,
              token_uri: true,
              name: true
            }
          }
        },
        orderBy,
        take,
        skip: (page - 1) * take
      }),
      prisma.nftActivity.count({
        where: filter
      })
    ]);

    return { activities, total };
  }
}
