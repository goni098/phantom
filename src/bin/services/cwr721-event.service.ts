import { DateTime } from "luxon";

import { NftRepository } from "@root/repositories/nft.repository";

import { findAttributeByKey } from "../shared/event-helper";
import type { ContractEvent } from "../shared/type";
import { CommonService } from "./common.service";

type HandleCwr721EventParams = {
  event: ContractEvent;
  txHash: string;
  context?: "stream" | "scanner";
};

export abstract class Cwr721EventService {
  public static async handleCwr721MintNft({
    event,
    txHash,
    context
  }: HandleCwr721EventParams) {
    const tokenAddress = findAttributeByKey(event, "_contract_address");
    const tokenId = findAttributeByKey(event, "token_id");
    const owner = findAttributeByKey(event, "owner");

    // case mint collection not mint nft, owner is missed, returning instead of throwing
    if (!tokenAddress || !tokenId || !owner) {
      return;
    }

    await CommonService.createNftIfNotExist(tokenAddress, tokenId);

    if (context === "scanner") {
      await CommonService.updateNftOwnerFromChain(tokenAddress, tokenId);
    } else {
      await NftRepository.updateOwner({
        tokenAddress,
        tokenId,
        ownerAddress: owner
      });
    }

    console.log(
      `Done handle cwr721 mint at ${DateTime.now().toUTC()} ${txHash}`
    );
  }

  public static async handleCwr721TransferNft({
    event,
    txHash,
    context
  }: HandleCwr721EventParams) {
    const tokenAddress = findAttributeByKey(event, "_contract_address");
    const tokenId = findAttributeByKey(event, "token_id");
    const recipient = findAttributeByKey(event, "recipient");

    if (!tokenAddress || !tokenId || !recipient) {
      throw new Error("Missing event attribute when handle cwr721 transfer");
    }

    await CommonService.createNftIfNotExist(tokenAddress, tokenId);

    if (context === "scanner") {
      await CommonService.updateNftOwnerFromChain(tokenAddress, tokenId);
    } else {
      await NftRepository.updateOwner({
        tokenAddress,
        tokenId,
        ownerAddress: recipient
      });
    }

    console.log(
      `Done handle cwr721 transfer at ${DateTime.now().toUTC()} ${txHash}`
    );
  }

  public static async handleCwr721SendNft({
    event,
    txHash,
    context
  }: HandleCwr721EventParams) {
    const tokenAddress = findAttributeByKey(event, "_contract_address");
    const tokenId = findAttributeByKey(event, "token_id");
    const recipient = findAttributeByKey(event, "recipient");

    if (!tokenAddress || !tokenId || !recipient) {
      throw new Error("Missing event attribute when handle cwr721 send_nft");
    }

    await CommonService.createNftIfNotExist(tokenAddress, tokenId);

    if (context === "scanner") {
      await CommonService.updateNftOwnerFromChain(tokenAddress, tokenId);
    } else {
      await NftRepository.updateOwner({
        tokenAddress,
        tokenId,
        ownerAddress: recipient
      });
    }

    console.log(
      `Done handle cwr721 send_nft at ${DateTime.now().toUTC()} ${txHash}`
    );
  }
}
