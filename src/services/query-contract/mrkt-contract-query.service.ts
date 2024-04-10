import { MRKT_CONTRACT_ADDRESS } from "@root/shared/config";
import { cosmosClient } from "@root/shared/cosmos";

export type Offer = {
  buyer: string;
  cw721_address: string;
  denom: {
    native: string;
  };
  duration: {
    end: number;
    start: number;
  };
  num_accepted: number;
  price: string;
  quantity: number;
  token_id: string | null;
};

type GetOfferParams = {
  tokenAddress: string;
  buyer: string;
  price: string;
  tokenId: string | null;
};

export type Sale = {
  buyout: string;
  can_accept: boolean;
  cw721_address: string;
  denom: {
    native: string;
  };
  duration_type:
    | "Fixed"
    | {
        Time: [number, number];
      };
  initial_price: string;
  min_bid_increment_percent: number;
  provider: string;
  sale_type: "Fixed" | "Auction";
  token_id: string;
};

type GetSaleParams = {
  tokenAddress: string;
  tokenId: string;
};

export abstract class MrktContractQueryService {
  public static getOffer({
    tokenAddress,
    tokenId,
    buyer,
    price
  }: GetOfferParams): Promise<Offer | null> {
    return cosmosClient.queryContractSmart(MRKT_CONTRACT_ADDRESS, {
      get_offer: {
        cw721_address: tokenAddress,
        buyer,
        price,
        token_id: tokenId
      }
    });
  }

  public static getSale({
    tokenAddress,
    tokenId
  }: GetSaleParams): Promise<Sale | null> {
    return cosmosClient.queryContractSmart(MRKT_CONTRACT_ADDRESS, {
      get_sale: {
        cw721_address: tokenAddress,
        token_id: tokenId
      }
    });
  }
}
