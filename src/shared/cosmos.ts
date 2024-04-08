import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";

import { readConfigOrDie } from "@root/helpers/read-config";

export const cosmosClient = await SigningCosmWasmClient.connect(
  readConfigOrDie("RPC_URL")
);
