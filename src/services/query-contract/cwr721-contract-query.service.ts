import { cosmosClient } from "@root/shared/cosmos";

type NftInfo = {
  token_uri: string;
  extension?: {
    royalty_percentage?: number;
  };
};

type NftOwner = {
  owner: string;
};

type NumTokens = {
  count: number;
};

type ContractInfo = {
  name: string;
  symbol: string;
};

type Supply = {
  count: number;
};

export abstract class Cwr721ContractQueryService {
  public static getNftInfo(
    contractAddress: string,
    tokenId: string
  ): Promise<NftInfo> {
    return cosmosClient.queryContractSmart(contractAddress, {
      nft_info: {
        token_id: tokenId
      }
    });
  }

  public static getNftOwner(
    contractAddress: string,
    tokenId: string
  ): Promise<NftOwner> {
    return cosmosClient.queryContractSmart(contractAddress, {
      owner_of: {
        token_id: tokenId
      }
    });
  }

  public static getNumTokensOfCollection(
    contractAddress: string
  ): Promise<NumTokens> {
    return cosmosClient.queryContractSmart(contractAddress, {
      num_tokens: {}
    });
  }

  public static getContractInfo(
    contractAddress: string
  ): Promise<ContractInfo> {
    return cosmosClient.queryContractSmart(contractAddress, {
      contract_info: {}
    });
  }

  public static getSupply(contractAddress: string): Promise<Supply> {
    return cosmosClient.queryContractSmart(contractAddress, {
      num_tokens: {}
    });
  }
}
