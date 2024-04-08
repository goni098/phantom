import WebSocket from "ws";

import { TracingRepository } from "@root/repositories/tracing.repository";
import { PALLET_CONTRACT_ADDRESS, RPC_WSS_URL } from "@root/shared/config";

import { PalletEventService } from "./services/pallet-event.service";
import type { PalletEvent } from "./shared/event-helper";
import {
  PALLET_EVENT,
  createSubscribeMessage,
  retrieveErrorMessage,
  retrievePalletEvents
} from "./shared/event-helper";
import type { MessageResponse } from "./shared/type";

listenStream();

function listenStream() {
  const websocket = new WebSocket(RPC_WSS_URL);

  websocket.on("open", () => {
    websocket.send(createSubscribeMessage("pallet", PALLET_CONTRACT_ADDRESS));
    console.log(`Listening Pallet contract logs: ${PALLET_CONTRACT_ADDRESS}`);
  });

  websocket.on("error", () => {
    websocket.close();
  });

  websocket.on("close", async () => {
    console.log("Socket encountered error, closed socket trying reconnect ...");

    listenStream();
    console.log("Reconnected");

    await TracingRepository.createMissingStreamBlock("pallet");
  });

  websocket.on("message", async raw => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messageResponse: MessageResponse = JSON.parse(raw as any) || {};

    const txHash = messageResponse?.result?.events?.["tx.hash"]?.[0];

    const palletEvents = retrievePalletEvents(messageResponse);

    if (!txHash || !palletEvents) {
      return;
    }

    for (const event of palletEvents) {
      try {
        switch (event.type as PalletEvent) {
          case PALLET_EVENT.CreateAuction:
            await PalletEventService.handleCreateAuctionEvent(event, txHash);
            break;

          case PALLET_EVENT.CancelAuction:
            await PalletEventService.handleCancelAuction(event, txHash);
            break;

          case PALLET_EVENT.BuyNow:
            await PalletEventService.handleBuyNow(event, txHash);
            break;

          default:
            continue;
        }

        await TracingRepository.createStreamTx({
          action: event.type,
          event,
          tx_hash: txHash,
          context: "pallet"
        });
      } catch (error) {
        await TracingRepository.createStreamTx({
          action: event.type,
          event,
          tx_hash: txHash,
          context: "pallet",
          is_failure: true,
          message: retrieveErrorMessage(error)
        });
      }
    }
  });
}
