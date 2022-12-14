export async function createNodeDbTables(knex) {
  const hasBalancesTable = await knex.schema.hasTable('balances');
  if (!hasBalancesTable) {
    await knex.schema.createTable('balances', function (t) {
      t.string('wallet_address').index();
      t.string('contract_tx_id').index();
      t.string('token_ticker').index();
      t.string('sort_key').index();
      t.string('token_name');
      t.string('balance');
      t.unique(['wallet_address', 'contract_tx_id'])
    });
  }

  const hasStatesTable = await knex.schema.hasTable('states');
  if (!hasStatesTable) {
    await knex.schema.createTable('states', function (t) {
      t.string('contract_tx_id').index().unique();
      t.string('sort_key').index();
      t.string('node').index();
      t.string('signature').index();
      t.jsonb('manifest');
      t.string('state_hash').index();
      t.jsonb('state');
    });
  }
}
