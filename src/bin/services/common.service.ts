import type { Marketplace, Prisma } from "@prisma/client";
import { DateTime } from "luxon";

import { CollectionRepository } from "@root/repositories/collection.repository";
import { NftRepository } from "@root/repositories/nft.repository";
import { TransactionRepository } from "@root/repositories/transaction.repository";
import { UserPointRepository } from "@root/repositories/user-point.respository";
import { getCollectionMetadata } from "@root/services/http/get-collection-metadata";
import { getNftMetadata } from "@root/services/http/get-nft-metadata";
import { Cwr721ContractQueryService } from "@root/services/query-contract/cwr721-contract-query.service";
import { prisma } from "@root/shared/prisma";
import { useiToSei } from "@root/utils/usei-to-sei";

type CreateActivityTransactionAndPointOnSaleParams = {
  denom: string;
  price: string;
  txHash: string;
  nftId: string;
  date: DateTime;
  seller: string;
  buyer: string;
  collectionAddress: string;
  marketplace: Marketplace;
  metadata?: Prisma.JsonValue;
};

export abstract class CommonService {
  public static async createCollectionIfNotExist(
    tokenAddress: string,
    royalty?: number
  ) {
    const existedCollection =
      await CollectionRepository.findByAddress(tokenAddress);

    if (!existedCollection) {
      const { name, symbol } =
        await Cwr721ContractQueryService.getContractInfo(tokenAddress);

      const { count } =
        await Cwr721ContractQueryService.getSupply(tokenAddress);

      const metadata = await getCollectionMetadata(tokenAddress);

      await CollectionRepository.create({
        address: tokenAddress,
        name,
        symbol,
        supply: count,
        royalty,
        description: metadata.description,
        banner: metadata.banner,
        image: metadata.pfp,
        socials: metadata.socials
      });
    }
  }

  public static async createNftIfNotExist(
    tokenAddress: string,
    tokenId: string
  ) {
    const existedNft = await NftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId
    });

    if (existedNft) {
      return existedNft.id;
    }

    const { token_uri, extension } =
      await Cwr721ContractQueryService.getNftInfo(tokenAddress, tokenId);

    await this.createCollectionIfNotExist(
      tokenAddress,
      extension?.royalty_percentage
    );

    const nftMetadata = await getNftMetadata(token_uri);

    const newNft = await NftRepository.createNft({
      tokenId,
      image: nftMetadata?.image,
      name: nftMetadata?.name,
      traits: nftMetadata?.attributes,
      description: nftMetadata?.description,
      collection: {
        address: tokenAddress
      },
      tokenUri: token_uri
    });

    return newNft.id;
  }

  public static async updateNftOwnerFromChain(
    tokenAddress: string,
    tokenId: string
  ) {
    const owner = await Cwr721ContractQueryService.getNftOwner(
      tokenAddress,
      tokenId
    );

    await NftRepository.updateOwner({
      tokenAddress,
      tokenId,
      ownerAddress: owner.owner
    });
  }

  public static createActivityTransactionAndPointOnSale({
    buyer,
    date,
    denom,
    nftId,
    price,
    seller,
    txHash,
    collectionAddress,
    metadata,
    marketplace
  }: CreateActivityTransactionAndPointOnSaleParams) {
    return prisma.$transaction([
      TransactionRepository.create({
        collection_address: collectionAddress,
        buyerAddress: buyer,
        sellerAddress: seller,
        txHash,
        volume: Number(price),
        createdDate: date,
        marketplace
      }),
      NftRepository.createNftActivity({
        denom,
        eventKind: "sale",
        buyerAddress: buyer,
        sellerAddress: seller,
        metadata: metadata || {},
        nftId,
        price: Number(price),
        txHash,
        createdDate: date,
        marketplace
      }),
      UserPointRepository.createUserPoint({
        date: DateTime.now(),
        kind: "buy",
        walletAddress: buyer,
        point: useiToSei(price)
      }),
      UserPointRepository.createUserPoint({
        date: DateTime.now(),
        kind: "sell",
        walletAddress: seller,
        point: useiToSei(price)
      })
    ]);
  }
}
