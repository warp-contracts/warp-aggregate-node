import {LoggerFactory} from "warp-contracts";

export class DbUpdates {
  #logger = LoggerFactory.INST.create('DbUpdates');
  #nodeDb

  constructor(db) {
    this.#nodeDb = db;
  }

  async upsertState(contractTxId, sortKey, state) {
    this.#logger.info('Upserting state', contractTxId);

    await this.#nodeDb('states')
      .insert({
        'contract_tx_id': contractTxId.trim(),
        'sort_key': sortKey,
        'state': state,
      })
      .onConflict(['contract_tx_id'])
      .merge();
  }

  async lastSortKey(contractTxId) {
    const result = await this.#nodeDb.raw(`SELECT max(sort_key) as maxSortKey
                      FROM states
                      WHERE contract_tx_id = ?`, [contractTxId]);

    if (!result || !result.length) {
      return null;
    }

    return result[0].maxSortKey;
  }

  async upsertBalances(contractTxId, sortKey, state) {
    const balances = state.balances;
    const ticker = state.ticker; // pst standard
    const symbol = state.symbol; // warp nft/erc standard
    const name = state.name;

    if (!balances || (!ticker && !symbol)) {
      this.#logger.error(`Contract ${contractTxId} is not compatible with token standard`);
      return;
    }
    const walletAddresses = Object.keys(balances);
    let inserts = [];
    for (const walletAddress of walletAddresses) {
      inserts.push({
        'wallet_address': walletAddress.trim(),
        'contract_tx_id': contractTxId.trim(),
        'token_ticker': ticker ? ticker.trim() : symbol.trim(),
        'token_name': name?.trim(),
        'balance': balances[walletAddress].toString(),
        'sort_key': sortKey
      });
      // sqlite explodes when trying to put too big batch insert
      if (inserts.length == 50) {
        await this.#nodeDb('balances')
          .insert(inserts)
          .onConflict(['wallet_address', 'contract_tx_id'])
          .merge();
        inserts = [];
      }
    }
    if (inserts.length) {
      await this.#nodeDb('balances')
        .insert(inserts)
        .onConflict(['wallet_address', 'contract_tx_id'])
        .merge();
      inserts = [];
    }
  }

}
