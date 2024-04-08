import axios from "axios";

import { readConfigOrDie } from "@root/helpers/read-config";

type CollectionMetadata = {
  pfp?: string;
  description?: string;
  slug?: string;
  banner?: string;
  volume?: number;
  socials?: Array<Record<string, string>>;
};

export const getCollectionMetadata = async (collection: string) => {
  const palletApiUrl = readConfigOrDie("PALLET_API_URL");

  try {
    const metadata = await axios
      .get<CollectionMetadata>(`${palletApiUrl}/v2/nfts/${collection}/details`)
      .then(response => response.data);

    return metadata;
  } catch {
    return {};
  }
};
