import {LoggerFactory} from 'warp-contracts';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import compress from 'koa-compress';
import zlib from 'zlib'
import Koa from 'koa';
import {createNodeDbTables} from "./db/initDb.mjs";
import Redis from "ioredis";
import * as fs from "fs";
import * as path from "path";
import {DbUpdates} from "./db/DbUpdates.mjs";
import {router} from "./router.mjs";
import knex from "knex";

LoggerFactory.INST.logLevel('none');
LoggerFactory.INST.logLevel('debug', 'listener');

const logger = LoggerFactory.INST.create('listener');

let port = 3001;

async function runListener() {
  const args = process.argv.slice(2);
  logger.info('🚀🚀🚀 Starting aggregate node with params:', args);

  const app = new Koa();
  app.use(cors({
    async origin() {
      return '*';
    },
  }));
  app.use(compress({
    threshold: 2048,
    deflate: false,
    br: {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 4
      }
    }
  }));

  const nodeDb = knex({
    client: 'better-sqlite3',
    connection: {
      filename: `sqlite/node.sqlite`
    },
    useNullAsDefault: true
  });
  await createNodeDbTables(nodeDb);
  const dbUpdates = new DbUpdates(nodeDb);
  await subscribeToGatewayNotifications(dbUpdates);

  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());

  app.context.nodeDb = nodeDb;

  app.listen(port);

  logger.info(`Listening on port ${port}`);
}


async function subscribeToGatewayNotifications(dbUpdates) {
  const connectionOptions = readGwPubSubConfig();
  const subscriber = new Redis(connectionOptions);
  await subscriber.connect();
  logger.info("Connected to gateway notifications", subscriber.status);

  subscriber.subscribe("states", (err, count) => {
    if (err) {
      logger.error("Failed to subscribe:", err.message);
    } else {
      logger.info(
        `Subscribed successfully! This client is currently subscribed to ${count} channels.`
      );
    }
  });

  subscriber.on("message", async (channel, message) => {
    const msgObj = JSON.parse(message);
    logger.info(`Received message from channel ${channel} for ${msgObj.contractTxId}`);
    if (!isTxIdValid(msgObj.contractTxId)) {
      logger.warn('Invalid contract txId');
      return;
    }

    const lastSortKey = await dbUpdates.lastSortKey(msgObj.contractTxId);

    if (msgObj.sortKey.localeCompare(lastSortKey)) {
      await dbUpdates.upsertState(
        msgObj.contractTxId, msgObj.sortKey, msgObj.state,
        msgObj.node, msgObj.signature, msgObj.manifest, msgObj.stateHash);
      await dbUpdates.upsertBalances(msgObj.contractTxId, msgObj.sortKey, msgObj.state);
    } else {
      logger.warn('Received state with older or equal sort key', {
        contract: msgObj.contractTxId,
        received: msgObj.sortKey,
        latest: lastSortKey
      });
    }
  });
}

await runListener();


function readGwPubSubConfig() {
  const json = fs.readFileSync(path.join('.secrets', 'gw-pubsub.json'), "utf-8");
  return JSON.parse(json);
}

function isTxIdValid(txId) {
  const validTxIdRegex = /[a-z0-9_-]{43}/i;
  return validTxIdRegex.test(txId);
}
