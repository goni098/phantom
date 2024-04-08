import WebSocket from "ws";

import { TracingRepository } from "@root/repositories/tracing.repository";
import { RPC_WSS_URL } from "@root/shared/config";

import { Cwr721EventService } from "./services/cwr721-event.service";
import type { Cwr721Actions } from "./shared/event-helper";
import {
  CWR721ACTIONS,
  createSubscribeMessage,
  findAttributeByKey,
  retrieveCwr721Events,
  retrieveErrorMessage
} from "./shared/event-helper";
import type { MessageResponse } from "./shared/type";

listenStream();

function listenStream() {
  const websocket = new WebSocket(RPC_WSS_URL);

  websocket.on("open", () => {
    websocket.send(createSubscribeMessage("cwr721"));

    console.log(`Listening stream on all cw721 contracts`);
  });

  websocket.on("error", () => {
    websocket.close();
  });

  websocket.on("close", async () => {
    console.log("Socket encountered error, closed socket trying reconnect ...");

    listenStream();
    console.log("Reconnected");

    await TracingRepository.createMissingStreamBlock("cwr721");
  });

  websocket.on("message", async raw => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messageResponse: MessageResponse = JSON.parse(raw as any) || {};

    const txHash = messageResponse?.result?.events?.["tx.hash"]?.[0];

    if (!txHash) {
      return;
    }

    const cwr721Events = retrieveCwr721Events(messageResponse);

    for (const event of cwr721Events) {
      const action = findAttributeByKey(event, "action") as Cwr721Actions;

      if (!action) {
        continue;
      }

      try {
        switch (action) {
          case CWR721ACTIONS.MintNft:
            await Cwr721EventService.handleCwr721MintNft({
              event,
              txHash
            });
            break;

          case CWR721ACTIONS.TransferNft:
            await Cwr721EventService.handleCwr721TransferNft({
              event,
              txHash
            });
            break;

          case CWR721ACTIONS.SendNft:
            await Cwr721EventService.handleCwr721SendNft({
              event,
              txHash
            });
            break;

          default:
            continue;
        }

        await TracingRepository.createStreamTx({
          action,
          event,
          tx_hash: txHash,
          context: "cwr721"
        });
      } catch (error) {
        await TracingRepository.createStreamTx({
          action,
          event,
          message: retrieveErrorMessage(error),
          tx_hash: txHash,
          is_failure: true,
          context: "cwr721"
        });
      }
    }
  });
}
