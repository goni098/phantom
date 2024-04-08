import { DateTime } from "luxon";
import WebSocket from "ws";

import { TracingRepository } from "@root/repositories/tracing.repository";
import { MRKT_CONTRACT_ADDRESS, RPC_WSS_URL } from "@root/shared/config";

import { MrktEventService } from "./services/mrkt-event.service";
import type { MrktMarketplaceActions } from "./shared/event-helper";
import {
  MRKT_MARKETPLACE_ACTIONS,
  createSubscribeMessage,
  findAction,
  findAttributeByKey,
  retrieveErrorMessage,
  retrieveWasmEvents
} from "./shared/event-helper";
import type { MessageResponse } from "./shared/type";

listenStream();

function listenStream() {
  const websocket = new WebSocket(RPC_WSS_URL);

  websocket.on("open", () => {
    websocket.send(createSubscribeMessage("mrkt", MRKT_CONTRACT_ADDRESS));
    console.log(`Listening Mrkt contract logs: ${MRKT_CONTRACT_ADDRESS}`);
  });

  websocket.on("error", () => {
    websocket.close();
  });

  websocket.on("close", async () => {
    console.log("Socket encountered error, closed socket trying reconnect ...");

    listenStream();
    console.log("Reconnected");

    await TracingRepository.createMissingStreamBlock("mrkt");
  });

  websocket.on("message", async raw => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messageResponse: MessageResponse = JSON.parse(raw as any) || {};

    const actions = messageResponse?.result?.events?.["wasm.action"] || [];
    const action = findAction(actions);
    const txHash = messageResponse?.result?.events?.["tx.hash"]?.[0];

    const wasmEvents = retrieveWasmEvents(messageResponse);

    if (!wasmEvents || !txHash || !action) {
      return;
    }

    for (const event of wasmEvents) {
      const action = findAttributeByKey(
        event,
        "action"
      ) as MrktMarketplaceActions;

      if (!action) {
        continue;
      }

      try {
        switch (action) {
          case MRKT_MARKETPLACE_ACTIONS.StartSale:
            await MrktEventService.handleStartSale(
              event,
              txHash,
              DateTime.now()
            );
            break;

          case MRKT_MARKETPLACE_ACTIONS.AcceptOffer:
            await MrktEventService.handleAcceptOffer(
              event,
              txHash,
              DateTime.now()
            );
            break;

          case MRKT_MARKETPLACE_ACTIONS.CancelSale:
            await MrktEventService.handleCancelSale(
              event,
              txHash,
              DateTime.now()
            );
            break;

          case MRKT_MARKETPLACE_ACTIONS.MakeCollectionOffer:
            await MrktEventService.handleMakeOffer(
              event,
              txHash,
              DateTime.now()
            );
            break;

          case MRKT_MARKETPLACE_ACTIONS.CancelCollectionOffer:
            await MrktEventService.handleCancelOffer(
              event,
              txHash,
              DateTime.now()
            );
            break;

          case MRKT_MARKETPLACE_ACTIONS.FixedSell:
            await MrktEventService.handleFixedSell(
              event,
              txHash,
              DateTime.now()
            );
            break;

          case MRKT_MARKETPLACE_ACTIONS.Bidding:
            await MrktEventService.handleBidding(event, txHash, DateTime.now());
            break;

          case MRKT_MARKETPLACE_ACTIONS.EditSale:
            await MrktEventService.handleEditSale(event, txHash);
            break;

          case MRKT_MARKETPLACE_ACTIONS.CancelBidding:
            await MrktEventService.handleCancelBidding(event, txHash);
            break;

          case MRKT_MARKETPLACE_ACTIONS.AcceptSale:
            await MrktEventService.handleAcceptSale(
              event,
              txHash,
              DateTime.now()
            );
            break;

          default:
            continue;
        }

        await TracingRepository.createStreamTx({
          action,
          event,
          tx_hash: txHash
        });
      } catch (error) {
        await TracingRepository.createStreamTx({
          action,
          event,
          tx_hash: txHash,
          is_failure: true,
          message: retrieveErrorMessage(error)
        });

        console.error(`Error when handle ${action}: ${txHash}`);
        console.error(error);
      }
    }
  });
}
