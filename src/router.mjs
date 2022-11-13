import Router from "@koa/router";
import {walletBalances} from "./routes/balances.js";
import {allStates} from "./routes/allStates.mjs";

export const router = new Router();

router.get("/balances", walletBalances);
router.get("/all-states", allStates);
