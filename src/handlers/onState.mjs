import { LoggerFactory } from "warp-contracts";

LoggerFactory.INST.logLevel("none");
LoggerFactory.INST.logLevel("debug", "listener");

const logger = LoggerFactory.INST.create("listener");

function isTxIdValid(txId) {
  const validTxIdRegex = /[a-z0-9_-]{43}/i;
  return validTxIdRegex.test(txId);
}

export async function onNewState(message, dbUpdates) {
  const msgObj = JSON.parse(message);
  if (!isTxIdValid(msgObj.contractTxId)) {
    logger.warn("Invalid contract txId");
    return;
  }

  const lastSortKey = await dbUpdates.lastSortKey(msgObj.contractTxId);

  if (msgObj.sortKey.localeCompare(lastSortKey)) {
    await dbUpdates.upsertState(
      msgObj.contractTxId,
      msgObj.sortKey,
      msgObj.state,
      msgObj.node,
      msgObj.signature,
      msgObj.manifest,
      msgObj.stateHash
    );
    await dbUpdates.upsertBalances(
      msgObj.contractTxId,
      msgObj.sortKey,
      msgObj.state
    );
  } else {
    logger.warn("Received state with older or equal sort key", {
      contract: msgObj.contractTxId,
      received: msgObj.sortKey,
      latest: lastSortKey,
    });
  }
}
