import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";
import compress from "koa-compress";
import zlib from "zlib";
import Koa from "koa";
import { router } from "./router.mjs";

export function createApp(nodeDb) {
  const app = new Koa();
  app.use(
    cors({
      async origin() {
        return "*";
      },
    })
  );
  app.use(
    compress({
      threshold: 2048,
      deflate: false,
      br: {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 4,
        },
      },
    })
  );

  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());

  app.context.nodeDb = nodeDb;

  return app;
}
