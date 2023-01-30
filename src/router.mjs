import Router from "@koa/router";
import { walletBalances } from "./routes/balances.js";
import { allStates } from "./routes/allStates.mjs";
import { interactions } from "./routes/interactionsByIndex.mjs";

export const router = new Router();

router.get("/balances", walletBalances);
router.get("/all-states", allStates);
router.get("/interactions-by-indexes", interactions);