import { LoggerFactory } from "warp-contracts";
import { createNodeDbTables } from "./db/initDb.mjs";
import Redis from "ioredis";
import * as fs from "fs";
import * as path from "path";
import { DbUpdates } from "./db/DbUpdates.mjs";
import knex from "knex";
import { onNewInteraction } from "./handlers/onInteraction.mjs";
import { createApp } from "./app.mjs";
import { onNewState } from "./handlers/onState.mjs";

LoggerFactory.INST.logLevel("none");
LoggerFactory.INST.logLevel("debug", "listener");

const logger = LoggerFactory.INST.create("listener");

let port = 3001;

async function runListener() {
  const args = process.argv.slice(2);
  logger.info("🚀🚀🚀 Starting aggregate node with params:", args);

  const nodeDb = knex({
    client: "better-sqlite3",
    connection: {
      filename: `sqlite/node.sqlite`,
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        // https://github.com/knex/knex/issues/4971#issuecomment-1030701574
        conn.pragma("journal_mode = WAL");
        cb();
      },
    },
  });
  await createNodeDbTables(nodeDb);
  const dbUpdates = new DbUpdates(nodeDb);
  await subscribeToGatewayNotifications(dbUpdates);

  const app = createApp(nodeDb);

  app.listen(port);
  logger.info(`Listening on port ${port}`);
}

async function subscribeToGatewayNotifications(dbUpdates) {
  const connectionOptions = readGwPubSubConfig();
  const subscriber = new Redis(connectionOptions);
  await subscriber.connect();
  logger.info("Connected to gateway notifications", subscriber.status);

  subscriber.subscribe("states", (err) => {
    if (err) {
      logger.error("Failed to subscribe:", err.message);
    } else {
      logger.info(
        `Subscribed successfully! This client is currently subscribed to state channel.`
      );
    }
  });

  subscriber.subscribe("contracts", (err) => {
    if (err) {
      logger.error("Failed to subscribe:", err.message);
    } else {
      logger.info(
        `Subscribed successfully! This client is currently subscribed to contracts channel.`
      );
    }
  });

  subscriber.on("message", async (channel, message) => {
    logger.info(`Received message from channel ${channel}`);
    if (channel === "contracts") {
      await onNewInteraction(message, dbUpdates);
    } else if (channel === "states") {
      await onNewState(message, dbUpdates);
    }
  });
}

await runListener();

function readGwPubSubConfig() {
  const json = fs.readFileSync(
    path.join(".secrets", "gw-pubsub.json"),
    "utf-8"
  );
  return JSON.parse(json);
}
