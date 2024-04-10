import type { SaleType } from "@prisma/client";
import { DateTime } from "luxon";

import { CollectionRepository } from "@root/repositories/collection.repository";
import { NftRepository } from "@root/repositories/nft.repository";
import { TransactionRepository } from "@root/repositories/transaction.repository";
import { MrktContractQueryService } from "@root/services/query-contract/mrkt-contract-query.service";
import { prisma } from "@root/shared/prisma";

import { findAttributeByKey } from "../shared/event-helper";
import type { ContractEvent } from "../shared/type";
import { CommonService } from "./common.service";

export abstract class MrktEventService {
  public static async handleStartSale(
    event: ContractEvent,
    txHash: string,
    date: DateTime
  ) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const tokenId = findAttributeByKey(event, "token_id");
    const initialPrice = findAttributeByKey(event, "initial_price");
    const saleType = findAttributeByKey(event, "sale_type") as SaleType; // auction or fixed
    const seller = findAttributeByKey(event, "seller");
    const denom = findAttributeByKey(event, "denom");

    if (
      !tokenAddress ||
      !tokenId ||
      !initialPrice ||
      !saleType ||
      !seller ||
      !denom
    ) {
      throw new Error(`missing event attribute in start_sale: ${txHash}`);
    }

    const nft_id = await CommonService.createNftIfNotExist(
      tokenAddress,
      tokenId
    );

    const sale = await MrktContractQueryService.getSale({
      tokenAddress,
      tokenId
    });

    if (sale) {
      await NftRepository.createMrktNftListing({
        nft_id,
        txHash,
        createdDate: date,
        sale
      });
    }

    await NftRepository.createNftActivity({
      eventKind: "list",
      denom,
      sellerAddress: seller,
      metadata: {},
      nft_id,
      price: Number(initialPrice),
      txHash,
      createdDate: date
    });

    console.log(
      `Done handle start_sale at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  public static async handleAcceptOffer(
    event: ContractEvent,
    txHash: string,
    date: DateTime
  ) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const tokenId = findAttributeByKey(event, "token_id");
    const buyer = findAttributeByKey(event, "buyer");
    const seller = findAttributeByKey(event, "seller");
    const price = findAttributeByKey(event, "price");
    const denom = findAttributeByKey(event, "denom"); //need emit

    if (!tokenAddress || !tokenId || !buyer || !seller || !price || !denom) {
      throw new Error(`missing event attribute in accept_offer: ${txHash}`);
    }

    const nftId = await CommonService.createNftIfNotExist(
      tokenAddress,
      tokenId
    );

    const sale = await MrktContractQueryService.getSale({
      tokenAddress,
      tokenId
    });

    const nftOffer = await MrktContractQueryService.getOffer({
      buyer,
      price,
      tokenAddress,
      tokenId
    });

    const collectionOffer = await MrktContractQueryService.getOffer({
      buyer,
      price,
      tokenAddress,
      tokenId: null
    });

    if (!sale) {
      await NftRepository.deleteListingIfExist({ tokenAddress, tokenId });
    }

    if (!nftOffer) {
      await NftRepository.deleteNftOfferIfExist({
        buyerAddress: buyer,
        price: Number(price),
        tokenAddress,
        tokenId
      });
    }

    if (!collectionOffer) {
      await CollectionRepository.deleteCollectionOfferIfExist({
        collectionAddress: tokenAddress,
        buyerAddress: buyer,
        price: Number(price)
      });
    } else {
      await CollectionRepository.updateCollectionOffer(collectionOffer);
    }

    await CommonService.createActivityTransactionAndPointOnSale({
      buyer,
      seller,
      collectionAddress: tokenAddress,
      date,
      denom,
      nftId,
      price,
      txHash,
      marketplace: "mrkt"
    });

    console.log(
      `Done handle accept_offer at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  public static async handleAcceptSale(
    event: ContractEvent,
    txHash: string,
    date: DateTime
  ) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const tokenId = findAttributeByKey(event, "token_id");
    const buyer = findAttributeByKey(event, "buyer");
    const seller = findAttributeByKey(event, "seller");
    const price = findAttributeByKey(event, "price");
    const denom = findAttributeByKey(event, "denom"); // need emit

    if (!tokenAddress || !tokenId || !buyer || !seller || !denom || !price) {
      throw new Error(`missing event attribute in accept_sale: ${txHash}`);
    }

    const nftId = await CommonService.createNftIfNotExist(
      tokenAddress,
      tokenId
    );

    const sale = await MrktContractQueryService.getSale({
      tokenAddress,
      tokenId
    });

    if (!sale) {
      await NftRepository.deleteListingIfExist({ tokenAddress, tokenId });
    }

    await CommonService.createActivityTransactionAndPointOnSale({
      buyer,
      seller,
      collectionAddress: tokenAddress,
      date,
      denom,
      nftId,
      price,
      txHash,
      marketplace: "mrkt"
    });

    console.log(
      `Done handle accept_sale at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  public static async handleCancelSale(
    event: ContractEvent,
    txHash: string,
    date: DateTime
  ) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const tokenId = findAttributeByKey(event, "token_id");
    const seller = findAttributeByKey(event, "seller");
    const price = findAttributeByKey(event, "price"); // need emit
    const denom = findAttributeByKey(event, "denom"); // need emit

    if (!tokenAddress || !tokenId || !seller || !price || !denom) {
      throw new Error(`missing event attribute in cancel_sale: ${txHash}`);
    }

    const nft_id = await CommonService.createNftIfNotExist(
      tokenAddress,
      tokenId
    );

    const sale = await MrktContractQueryService.getSale({
      tokenAddress,
      tokenId
    });

    if (!sale) {
      await NftRepository.deleteListingIfExist({ tokenAddress, tokenId });
    }

    await NftRepository.createNftActivity({
      denom,
      eventKind: "delist",
      metadata: {},
      txHash,
      price: Number(price),
      nft_id,
      sellerAddress: seller,
      createdDate: date
    });

    console.log(
      `Done handle cancel_sale at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  // include collection_offer and single_nft_offer
  public static async handleMakeOffer(
    event: ContractEvent,
    txHash: string,
    date: DateTime
  ) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const buyer = findAttributeByKey(event, "buyer");
    const quantity = findAttributeByKey(event, "quantity");
    const price = findAttributeByKey(event, "price");
    const denom = findAttributeByKey(event, "denom");

    const tokenId = findAttributeByKey(event, "token_id"); //available when offer is single nft offer

    if (!tokenAddress || !buyer || !quantity || !price || !denom) {
      throw new Error(`missing event attribute in make_offer: ${txHash}`);
    }

    await CommonService.createCollectionIfNotExist(tokenAddress);

    if (tokenId) {
      // make single nft offer
      const nft_id = await CommonService.createNftIfNotExist(
        tokenAddress,
        tokenId
      );

      const nftOffer = await MrktContractQueryService.getOffer({
        buyer,
        price,
        tokenAddress,
        tokenId
      });

      if (nftOffer) {
        await NftRepository.createNftOffer({
          nft_id,
          createdDate: date,
          offer: nftOffer,
          txHash
        });
      }

      await NftRepository.createNftActivity({
        denom,
        eventKind: "make_offer",
        nft_id,
        metadata: {},
        price: Number(price),
        txHash,
        buyerAddress: buyer,
        createdDate: date
      });

      console.log(
        `Done handle make_single_nft_offer at ${DateTime.now().toUTC()}: ${txHash}`
      );
    } else {
      // make collection offer
      const collectionOffer = await MrktContractQueryService.getOffer({
        buyer,
        price,
        tokenAddress,
        tokenId: null
      });

      if (collectionOffer) {
        await CollectionRepository.createCollectionOffer({
          offer: collectionOffer,
          txHash,
          createdDate: date
        });
      }

      console.log(
        `Done handle make_collection_offer at ${DateTime.now().toUTC()}: ${txHash}`
      );
    }
  }

  // include collection_offer and single_nft_offer
  public static async handleCancelOffer(
    event: ContractEvent,
    txHash: string,
    date: DateTime
  ) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const buyer = findAttributeByKey(event, "buyer");
    const price = findAttributeByKey(event, "price");
    const denom = findAttributeByKey(event, "denom"); // need emit

    const tokenId = findAttributeByKey(event, "token_id"); //available when cancel a single nft offer

    if (!tokenAddress || !buyer || !price || !denom) {
      throw new Error(`missing event attribute in cancel_offer: ${txHash}`);
    }

    if (tokenId) {
      const nft_id = await CommonService.createNftIfNotExist(
        tokenAddress,
        tokenId
      );

      const nftOffer = await MrktContractQueryService.getOffer({
        buyer,
        price,
        tokenAddress,
        tokenId
      });

      if (!nftOffer) {
        await NftRepository.deleteNftOfferIfExist({
          buyerAddress: buyer,
          price: Number(price),
          tokenAddress,
          tokenId
        });
      }

      await NftRepository.createNftActivity({
        denom,
        eventKind: "cancel_offer",
        metadata: {},
        nft_id,
        price: Number(price),
        txHash,
        buyerAddress: buyer,
        createdDate: date
      });

      console.log(
        `Done handle cancel_single_nft_offer at ${DateTime.now().toUTC()}: ${txHash}`
      );
    } else {
      const collectionOffer = await MrktContractQueryService.getOffer({
        buyer,
        price,
        tokenAddress,
        tokenId: null
      });

      if (!collectionOffer) {
        await CollectionRepository.deleteCollectionOfferIfExist({
          buyerAddress: buyer,
          collectionAddress: tokenAddress,
          price: Number(price)
        });
      }

      console.log(
        `Done handle cancel_collection_offer at ${DateTime.now().toUTC()}: ${txHash}`
      );
    }
  }

  public static async handleFixedSell(
    event: ContractEvent,
    txHash: string,
    date: DateTime
  ) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const buyer = findAttributeByKey(event, "buyer");
    const seller = findAttributeByKey(event, "seller");
    const tokenId = findAttributeByKey(event, "token_id");
    const messages = findAttributeByKey(event, "messages");
    const price = findAttributeByKey(event, "price");
    const denom = findAttributeByKey(event, "denom"); // need emit

    if (!tokenAddress || !buyer || !seller || !tokenId || !price || !denom) {
      throw new Error(`missing event attribute in fixed_cell: ${txHash}`);
    }

    const nftId = await CommonService.createNftIfNotExist(
      tokenAddress,
      tokenId
    );

    const sale = await MrktContractQueryService.getSale({
      tokenAddress,
      tokenId
    });

    if (!sale) {
      await NftRepository.deleteListingIfExist({ tokenAddress, tokenId });
    }

    await CommonService.createActivityTransactionAndPointOnSale({
      buyer,
      collectionAddress: tokenAddress,
      date,
      denom,
      nftId,
      price,
      seller,
      txHash,
      metadata: { messages },
      marketplace: "mrkt"
    });

    console.log(
      `Done handle fixed_sell at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  public static async handleBidding(
    event: ContractEvent,
    txHash: string,
    date: DateTime
  ) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const buyer = findAttributeByKey(event, "buyer");
    const tokenId = findAttributeByKey(event, "token_id");
    const price = findAttributeByKey(event, "price");

    if (!tokenAddress || !buyer || !tokenId || !price) {
      throw new Error(`missing event attribute in bidding: ${txHash}`);
    }

    const nftWithListing = await NftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (!nftWithListing || !nftWithListing.Listing) {
      throw new Error(`Not found nft with listing when bidding: ${txHash}`);
    }

    await prisma.$transaction([
      TransactionRepository.create({
        buyerAddress: buyer,
        sellerAddress: nftWithListing.Listing.seller_address,
        collection_address: tokenAddress,
        txHash,
        volume: Number(price),
        createdDate: date
      }),
      NftRepository.createNftBidding({
        buyerAddress: buyer,
        listing: nftWithListing.Listing,
        price: Number(price),
        txHash,
        createdDate: date
      })
    ]);

    console.log(`Done handle bidding at ${DateTime.now().toUTC()}: ${txHash}`);
  }

  public static async handleCancelBidding(
    event: ContractEvent,
    txHash: string
  ) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const tokenId = findAttributeByKey(event, "token_id");
    const buyer = findAttributeByKey(event, "buyer");

    if (!tokenAddress || !buyer || !tokenId) {
      throw new Error(`missing event attribute in cancel_propose: ${txHash}`);
    }

    const nftWithListing = await NftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (!nftWithListing || !nftWithListing.Listing) {
      throw new Error(
        `Not found nft with listing when cancel_propose: ${txHash}`
      );
    }
    //??
    await NftRepository.deleteNftBidding(buyer, nftWithListing.Listing);

    console.log(
      `Done handle cancel_propose at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  public static async handleEditSale(event: ContractEvent, txHash: string) {
    const tokenAddress = findAttributeByKey(event, "cw721_address");
    const tokenId = findAttributeByKey(event, "token_id");

    const price = findAttributeByKey(event, "initial_price");
    const minBidIncrementPercent = findAttributeByKey(
      event,
      "min_bid_increment_percent"
    );

    if (!tokenAddress || !tokenId) {
      throw new Error(`missing event attribute in edit_sale: ${txHash}`);
    }

    const nftWithListing = await NftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (!nftWithListing || !nftWithListing.Listing) {
      throw new Error(`Not found nft with listing when edit_sale: ${txHash}`);
    }

    await NftRepository.updateListing({
      listing: nftWithListing.Listing,
      minBidIncrementPercent: minBidIncrementPercent
        ? Number(minBidIncrementPercent)
        : undefined,
      price: price ? Number(price) : undefined
    });

    console.log(
      `Done handle edit_sale at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }
}
