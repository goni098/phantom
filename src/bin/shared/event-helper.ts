import { v4 } from "uuid";

import { toUtf8 } from "@root/utils/base64";
import { intoError } from "@root/utils/into-error";

import type { MessageResponse, WasmEvents } from "./type";

export const CWR721ACTIONS = {
  SendNft: "send_nft",
  MintNft: "mint",
  TransferNft: "transfer_nft"
} as const;

export type Cwr721Actions = (typeof CWR721ACTIONS)[keyof typeof CWR721ACTIONS];

export const MRKT_MARKETPLACE_ACTIONS = {
  StartSale: "start_sale",
  AcceptOffer: "accept_offer",
  AcceptSale: "accept_sale",
  CancelSale: "cancel_sale",
  MakeCollectionOffer: "make_collection_offer",
  CancelCollectionOffer: "cancel_collection_offer",
  FixedSell: "fixed_sell",
  Bidding: "bidding",
  EditSale: "edit_sale",
  CancelBidding: "cancel_propose"
} as const;

export type MrktMarketplaceActions =
  (typeof MRKT_MARKETPLACE_ACTIONS)[keyof typeof MRKT_MARKETPLACE_ACTIONS];

export const PALLET_EVENT = {
  CreateAuction: "wasm-create_auction",
  BuyNow: "wasm-buy_now",
  CancelAuction: "wasm-cancel_auction"
} as const;

export type PalletEvent = (typeof PALLET_EVENT)[keyof typeof PALLET_EVENT];

export const LAUNCHPAD_ACTIONS = {
  MintNft: "mint_nft"
} as const;

export type LaunchpadActions =
  (typeof LAUNCHPAD_ACTIONS)[keyof typeof LAUNCHPAD_ACTIONS];

export const findEventsByAction = (
  events: WasmEvents,
  action: MrktMarketplaceActions
) =>
  events.filter(
    event =>
      !!event.attributes.find(
        attribute => attribute.key === "action" && attribute.value === action
      )
  );

export const findAction = (
  actions: Array<string>
): MrktMarketplaceActions | undefined =>
  Object.values(MRKT_MARKETPLACE_ACTIONS).find(action =>
    actions.includes(action)
  );

export const findAttributeByKey = <T = string>(
  event: WasmEvents[number],
  key: string
): T | undefined => {
  const attribute = event.attributes.find(attribute => attribute.key === key);
  if (attribute) {
    return attribute.value as T;
  }

  return undefined;
};

export const createSubscribeMessage = (
  option: "mrkt" | "pallet" | "cwr721" | "launchpad",
  contractAddress?: string
) => {
  let query = `tm.event = 'Tx' AND wasm._contract_address EXISTS AND wasm.token_id EXISTS AND wasm.action EXISTS`;

  switch (option) {
    case "mrkt":
      query = `tm.event = 'Tx' AND wasm._contract_address='${contractAddress}'`;
      break;

    case "pallet":
      query = `tm.event = 'Tx' AND execute._contract_address='${contractAddress}'`;
      break;

    default:
      break;
  }

  return JSON.stringify({
    jsonrpc: "2.0",
    method: "subscribe",
    id: v4().toString(),
    params: {
      query
    }
  });
};

export const retrieveWasmEvents = (messageResponse: MessageResponse) => {
  const wasmEvents =
    messageResponse.result?.data?.value?.TxResult?.result.events
      .filter(event => event.type === "wasm")
      .map(({ attributes, type }) => {
        const attributesInUtf8 = attributes.map(({ key, value }) => ({
          key: toUtf8(key),
          value: toUtf8(value)
        }));

        return {
          type,
          attributes: attributesInUtf8
        };
      });

  return wasmEvents;
};

export const retrievePalletEvents = (messageResponse: MessageResponse) => {
  const events = messageResponse.result?.data?.value?.TxResult?.result.events
    .filter(event => Object.values(PALLET_EVENT as object).includes(event.type))
    .map(({ attributes, type }) => {
      const attributesInUtf8 = attributes.map(({ key, value }) => ({
        key: toUtf8(key),
        value: toUtf8(value)
      }));

      return {
        type,
        attributes: attributesInUtf8
      };
    });

  return events;
};

export const retrieveCwr721Events = (messageResponse: MessageResponse) =>
  retrieveWasmEvents(messageResponse)?.filter(event => {
    const actionAttribute = event.attributes.find(
      ({ key, value }) =>
        key === "action" &&
        Object.values(CWR721ACTIONS as object).includes(value)
    );

    if (!actionAttribute) {
      return false;
    }

    return true;
  }) || [];

export const retrieveLaunchpadEvents = (
  messageResponse: MessageResponse,
  launchpad_contract_addr: string
) =>
  retrieveWasmEvents(messageResponse)?.filter(event => {
    const actionAttribute = event.attributes.find(
      ({ key, value }) =>
        key === "action" &&
        Object.values(LAUNCHPAD_ACTIONS as object).includes(value)
    );

    const contractAddressAttribute = event.attributes.find(
      ({ key, value }) =>
        key === "_contract_address" && launchpad_contract_addr === value
    );

    if (!actionAttribute || !contractAddressAttribute) {
      return false;
    }

    return true;
  }) || [];

export const retrieveErrorMessage = (error: unknown) =>
  intoError(error).message;
