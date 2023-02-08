import knex from "knex";
import { readFileSync } from "fs";
import { join } from "path";
import { DbUpdates } from "../../src/db/DbUpdates";
import { onNewInteraction } from "../../src/handlers/onInteraction.mjs";
import { createNodeDbTables } from "../../src/db/initDb.mjs";

const INTERACTION = JSON.parse(
  readFileSync(join(process.cwd(), "test", "__data__", "interaction_1.json"))
);
const INDEXED_INTERACTION = JSON.parse(
  readFileSync(
    join(process.cwd(), "test", "__data__", "interaction_indexed.json")
  )
);

describe("on interactions", () => {
  let nodeDb;

  beforeAll(async () => {
    nodeDb = knex({
      client: "better-sqlite3",
      connection: ":memory:",
      useNullAsDefault: true,
    });
    await createNodeDbTables(nodeDb);
  });

  afterAll(async () => {
    await nodeDb.destroy();
  });

  afterEach(async () => {
    await nodeDb("interactions").del();
  });

  it('should NOT save interaction to DB if missing TAG "Indexed-By"', async () => {
    const dbUpdates = new DbUpdates(nodeDb);

    await onNewInteraction(INTERACTION, dbUpdates);

    const interactions = await nodeDb.raw("SELECT * FROM interactions");

    expect(interactions.length).toEqual(0);
  });

  it('should save interaction with tag "Indexed-By" to DB', async () => {
    const dbUpdates = new DbUpdates(nodeDb);

    await onNewInteraction(INDEXED_INTERACTION, dbUpdates);

    const interactions = await nodeDb.raw("SELECT * FROM interactions");

    expect(interactions.length).toEqual(1);
    expect(interactions[0]).toEqual({
      block_height: 1108344,
      contract_tx_id: "VFr3Bk-uM-motpNNkkFg4lNW1BMmSfzqsVO551Ho4hA",
      id: "Q5JZKsQsW-YfD_cro-LkLPMm29_UX-RC2cPKNV7HtfQ",
      owner_address: "96nQROiF0ahfpMzTtyfpRNa_gu7s7OUWPUhsHSsz5aI",
      tag_index_0: "one",
      tag_index_1: "two",
      tag_index_2: null,
      tag_index_3: null,
      tag_index_4: null,
    });
  });

  it("should dont save more then 5 tags", async () => {
    const dbUpdates = new DbUpdates(nodeDb);

    const message = INDEXED_INTERACTION;
    message.interaction.tags = message.interaction.tags.map((tag) => {
      if (tag.name === "Indexed-By") {
        return {
          name: "Indexed-By",
          value: "1;2;3;4;5;6",
        };
      }
      return tag;
    });

    await onNewInteraction(message, dbUpdates);

    const interactions = await nodeDb.raw("SELECT * FROM interactions");

    expect(interactions.length).toEqual(1);
    expect(interactions[0]).toEqual({
      block_height: 1108344,
      contract_tx_id: "VFr3Bk-uM-motpNNkkFg4lNW1BMmSfzqsVO551Ho4hA",
      id: "Q5JZKsQsW-YfD_cro-LkLPMm29_UX-RC2cPKNV7HtfQ",
      owner_address: "96nQROiF0ahfpMzTtyfpRNa_gu7s7OUWPUhsHSsz5aI",
      tag_index_0: "1",
      tag_index_1: "2",
      tag_index_2: "3",
      tag_index_3: "4",
      tag_index_4: "5",
    });
  });
});
