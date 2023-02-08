import Router from "@koa/router";
import { walletBalances } from "./routes/balances.js";
import { allStates } from "./routes/allStates.mjs";
import { interactions } from "./routes/interactionsByIndex.mjs";
import { taggedNftByOwner } from "./routes/taggedNftByOwner.mjs";

export const router = new Router();

router.get("/balances", walletBalances);
router.get("/all-states", allStates);
router.get("/interactions-by-indexes", interactions);
router.get("/nft-by-owner", taggedNftByOwner)
