import { PALLET_CONTRACT_ADDRESS } from "@root/shared/config";
import { cosmosClient } from "@root/shared/cosmos";

type GetListingParams = {
  tokenAddress: string;
  tokenId: string;
};

export type PalletListing = {
  auction_type: "fixed_price";
  created_at: number;
  expiration_time: number;
  id: number;
  prices: Array<{
    amount: string;
    denom: string;
  }>;
};

export type PalletListingResponse = {
  nft_address: string;
  nft_token_id: string;
  owner: string;
  auction: PalletListing | null;
};

export abstract class PalletContractQueryService {
  public static getListing({
    tokenAddress,
    tokenId
  }: GetListingParams): Promise<PalletListingResponse> {
    return cosmosClient.queryContractSmart(PALLET_CONTRACT_ADDRESS, {
      nft: {
        address: tokenAddress,
        token_id: tokenId
      }
    });
  }

  public static getTx(txHash: string) {
    return cosmosClient.getTx(txHash);
  }
}
