import axios from "axios";
import { retry } from "ts-retry-promise";

export type NftAttribute = {
  trait_type?: string;
  type?: string;
  value?: string | number;
  display_type?: string;
};

type NftMetadata = {
  description?: string;
  external_url?: string;
  image?: string;
  name?: string;
  attributes?: Array<NftAttribute>;
};

export const getNftMetadata = async (tokenUri: string) => {
  try {
    const metadata = await retry(
      () =>
        axios.get<NftMetadata | null>(tokenUri).then(response => response.data),
      {
        retries: 6,
        delay: 200,
        timeout: 12_000
      }
    );

    if (Buffer.isBuffer(metadata)) {
      return JSON.parse(metadata.toString()) as NftMetadata;
    }

    return metadata;
  } catch {
    return {};
  }
};
