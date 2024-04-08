import { DateTime } from "luxon";

import { NftRepository } from "@root/repositories/nft.repository";
import { PalletContractQueryService } from "@root/services/query-contract/pallet-contract-query.service";

import { findAttributeByKey } from "../shared/event-helper";
import type { ContractEvent } from "../shared/type";
import { CommonService } from "./common.service";

export abstract class PalletEventService {
  public static async handleCreateAuctionEvent(
    event: ContractEvent,
    txHash: string
  ) {
    const tokenAddress = findAttributeByKey(event, "nft_address");
    const tokenId = findAttributeByKey(event, "nft_token_id");

    if (!tokenAddress || !tokenId) {
      throw new Error(`Missing event attribute in create_auction ${txHash}`);
    }

    const palletListing = await PalletContractQueryService.getListing({
      tokenAddress,
      tokenId
    });

    if (!palletListing.auction) {
      return;
    }

    const { amount, denom } = palletListing.auction.prices?.[0] || {};

    if (!amount || !denom) {
      throw new Error(`Missing amount or denom from Pallet listing: ${txHash}`);
    }

    const nftId = await CommonService.createNftIfNotExist(
      tokenAddress,
      tokenId
    );

    await NftRepository.createPalletNftListing({
      nftId,
      txHash,
      palletListingResponse: palletListing,
      amount: Number(amount),
      denom
    });

    await NftRepository.createNftActivity({
      eventKind: "list",
      denom,
      sellerAddress: palletListing.owner,
      metadata: {},
      nftId,
      price: Number(amount),
      txHash,
      createdDate: DateTime.fromSeconds(palletListing.auction.created_at),
      marketplace: "pallet"
    });

    console.log(
      `Done handle create_auction at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  public static async handleCancelAuction(
    event: ContractEvent,
    txHash: string
  ) {
    const tokenAddress = findAttributeByKey(event, "nft_address");
    const tokenId = findAttributeByKey(event, "nft_token_id");

    if (!tokenAddress || !tokenId) {
      throw new Error(`Missing event attribute in cancel_auction ${txHash}`);
    }

    const nft = await NftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (!nft || !nft.Listing) {
      return;
    }

    await NftRepository.deleteListingIfExist({
      tokenAddress,
      tokenId,
      marketplace: "pallet"
    });

    await NftRepository.createNftActivity({
      eventKind: "delist",
      denom: nft.Listing.denom,
      sellerAddress: nft.Listing.seller_address,
      metadata: {},
      nftId: nft.id,
      price: Number(nft.Listing.price),
      txHash,
      createdDate: DateTime.now(),
      marketplace: "pallet"
    });

    console.log(
      `Done handle cancel_auction at ${DateTime.now().toUTC()}: ${txHash}`
    );
  }

  public static async handleBuyNow(event: ContractEvent, txHash: string) {
    const tokenAddress = findAttributeByKey(event, "nft_address");
    const tokenId = findAttributeByKey(event, "nft_token_id");

    if (!tokenAddress || !tokenId) {
      throw new Error(`Missing event attribute in cancel_auction ${txHash}`);
    }

    const nft = await NftRepository.findByAddressAndTokenId({
      tokenAddress,
      tokenId,
      withListing: true
    });

    if (!nft || !nft.Listing) {
      return;
    }

    const tx = await PalletContractQueryService.getTx(txHash);

    const buyerAddress = tx?.events
      .find(
        e =>
          e.type === "wasm" && !!e.attributes.find(a => a.key === "recipient")
      )
      ?.attributes.find(a => a.key === "recipient")?.value;

    await NftRepository.deleteListingIfExist({
      tokenAddress,
      tokenId,
      marketplace: "pallet"
    });

    await CommonService.createActivityTransactionAndPointOnSale({
      buyer: buyerAddress || "unknown",
      seller: nft.Listing.seller_address,
      collectionAddress: tokenAddress,
      date: DateTime.now(),
      denom: "usei",
      nftId: nft.id,
      price: nft.Listing.price.toString(),
      txHash,
      marketplace: "pallet"
    });

    console.log(`Done handle buy_now at ${DateTime.now().toUTC()}: ${txHash}`);
  }
}
