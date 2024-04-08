import type { IndexedTx } from "@cosmjs/cosmwasm-stargate";
import { DateTime } from "luxon";

import { TracingRepository } from "@root/repositories/tracing.repository";
import { MRKT_CONTRACT_ADDRESS } from "@root/shared/config";
import { cosmosClient } from "@root/shared/cosmos";

import type {
  Cwr721Actions,
  MrktMarketplaceActions,
  PalletEvent
} from "../shared/event-helper";
import {
  CWR721ACTIONS,
  MRKT_MARKETPLACE_ACTIONS,
  PALLET_EVENT,
  findAttributeByKey,
  retrieveErrorMessage
} from "../shared/event-helper";
import type { ContractEvent, WasmEvents } from "../shared/type";
import { Cwr721EventService } from "./cwr721-event.service";
import { MrktEventService } from "./mrkt-event.service";
import { PalletEventService } from "./pallet-event.service";

export abstract class MissingEventService {
  public static async handleMissingMrktTx(tx: IndexedTx) {
    const events = this.findMrktWasmEventsOnTx(tx);

    if (!events.length) {
      return;
    }

    const mrktStreamTx = await TracingRepository.findStreamTxByTxHashAndContext(
      {
        txHash: tx.hash,
        context: "mrkt"
      }
    );

    if (mrktStreamTx) {
      console.log(`mrkt stream tx is already handled: ${tx.hash}`);
      return;
    }

    await this.handleMissingMrktEvents(events, tx.hash, tx.height);
  }

  public static async handleMissingCwr721Tx(tx: IndexedTx) {
    const events = this.findCwr721EventsOnTx(tx);

    if (!events.length) {
      return;
    }

    const cwr721StreamTx =
      await TracingRepository.findStreamTxByTxHashAndContext({
        txHash: tx.hash,
        context: "cwr721"
      });

    if (cwr721StreamTx) {
      console.log(`cwr721 stream tx is already handled: ${tx.hash}`);
      return;
    }

    await this.handleMissingCwr721Events(events, tx.hash);
  }

  public static async handleMissingPalletTx(tx: IndexedTx) {
    const events = this.findPalletEventsOnTx(tx);

    if (!events.length) {
      return;
    }

    const palletStreamTx =
      await TracingRepository.findStreamTxByTxHashAndContext({
        txHash: tx.hash,
        context: "pallet"
      });

    if (palletStreamTx) {
      console.log(`pallet stream tx is already handled: ${tx.hash}`);
      return;
    }

    await this.handleMissingPalletEvents(events, tx.hash);
  }

  private static async handleMissingMrktEvents(
    events: WasmEvents,
    txHash: string,
    height: number
  ) {
    for (const event of events) {
      const action = findAttributeByKey<MrktMarketplaceActions>(
        event,
        "action"
      );

      if (!action) {
        continue;
      }

      try {
        const date = await cosmosClient
          .getBlock(height)
          .then(block => block.header.time)
          .then(DateTime.fromISO);

        switch (action) {
          case MRKT_MARKETPLACE_ACTIONS.StartSale:
            await MrktEventService.handleStartSale(event, txHash, date);
            break;

          case MRKT_MARKETPLACE_ACTIONS.AcceptOffer:
            await MrktEventService.handleAcceptOffer(event, txHash, date);
            break;

          case MRKT_MARKETPLACE_ACTIONS.CancelSale:
            await MrktEventService.handleCancelSale(event, txHash, date);
            break;

          case MRKT_MARKETPLACE_ACTIONS.MakeCollectionOffer:
            await MrktEventService.handleMakeOffer(event, txHash, date);
            break;

          case MRKT_MARKETPLACE_ACTIONS.CancelCollectionOffer:
            await MrktEventService.handleCancelOffer(event, txHash, date);
            break;

          case MRKT_MARKETPLACE_ACTIONS.FixedSell:
            await MrktEventService.handleFixedSell(event, txHash, date);
            break;

          case MRKT_MARKETPLACE_ACTIONS.Bidding:
            await MrktEventService.handleBidding(event, txHash, date);
            break;

          case MRKT_MARKETPLACE_ACTIONS.EditSale:
            await MrktEventService.handleEditSale(event, txHash);
            break;

          case MRKT_MARKETPLACE_ACTIONS.CancelBidding:
            await MrktEventService.handleCancelBidding(event, txHash);
            break;

          case MRKT_MARKETPLACE_ACTIONS.AcceptSale:
            await MrktEventService.handleAcceptSale(event, txHash, date);
            break;

          default:
            continue;
        }

        await TracingRepository.createStreamTx({
          action,
          event,
          tx_hash: txHash,
          context: "mrkt"
        });
      } catch (error) {
        await TracingRepository.createStreamTx({
          action,
          event,
          tx_hash: txHash,
          is_failure: true,
          message: retrieveErrorMessage(error),
          context: "mrkt"
        });
      }
    }
  }

  private static async handleMissingCwr721Events(
    nftEvents: WasmEvents,
    txHash: string
  ) {
    for (const event of nftEvents) {
      const action = findAttributeByKey<Cwr721Actions>(event, "action");

      if (!action) {
        continue;
      }

      try {
        switch (action) {
          case CWR721ACTIONS.MintNft:
            await Cwr721EventService.handleCwr721MintNft({
              event,
              txHash,
              context: "scanner"
            });
            break;

          case CWR721ACTIONS.TransferNft:
            await Cwr721EventService.handleCwr721TransferNft({
              event,
              txHash,
              context: "scanner"
            });
            break;

          case CWR721ACTIONS.SendNft:
            await Cwr721EventService.handleCwr721SendNft({
              event,
              txHash,
              context: "scanner"
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
  }

  private static async handleMissingPalletEvents(
    events: Array<ContractEvent>,
    txHash: string
  ) {
    for (const event of events) {
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
          message: retrieveErrorMessage(error),
          tx_hash: txHash,
          is_failure: true,
          context: "pallet"
        });
      }
    }
  }

  private static findMrktWasmEventsOnTx(tx: IndexedTx): WasmEvents {
    return tx.events.filter(
      event =>
        event.type === "wasm" &&
        !!event.attributes.find(
          ({ key, value }) =>
            key === "_contract_address" && value === MRKT_CONTRACT_ADDRESS
        )
    );
  }

  private static findCwr721EventsOnTx(tx: IndexedTx) {
    return tx.events.filter(
      ({ type, attributes }) =>
        type === "wasm" &&
        !!attributes.find(
          ({ key, value }) =>
            key === "action" &&
            Object.values(CWR721ACTIONS as object).includes(value)
        )
    );
  }

  private static findPalletEventsOnTx(tx: IndexedTx) {
    return tx.events.filter(event =>
      Object.values(PALLET_EVENT as object).includes(event.type)
    );
  }
}
