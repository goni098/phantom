import { readConfigOrDie } from "@root/helpers/read-config";

export const MRKT_CONTRACT_ADDRESS = readConfigOrDie("MRKT_CONTRACT_ADDRESS");
export const RPC_URL = readConfigOrDie("RPC_URL");
export const RPC_WSS_URL = readConfigOrDie("RPC_WSS_URL");
export const PALLET_CONTRACT_ADDRESS = readConfigOrDie(
  "PALLET_CONTRACT_ADDRESS"
);
export const PALLET_API_URL = readConfigOrDie("PALLET_API_URL");
