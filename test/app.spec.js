import knex from "knex";
import { createNodeDbTables } from "../src/db/initDb.mjs";
import { createApp } from "../src/app.mjs";
import request from "supertest";
import { DbUpdates } from "../src/db/DbUpdates.mjs";

describe("routes tests", () => {
  let nodeDb;
  let app;

  beforeAll(async () => {
    nodeDb = knex({
      client: "better-sqlite3",
      connection: ":memory:",
      useNullAsDefault: true,
    });
    app = createApp(nodeDb);
    await createNodeDbTables(nodeDb);
  });

  afterAll(async () => {
    await nodeDb.destroy();
  });

  afterEach(async () => {
    await nodeDb("interactions").del();
    await nodeDb("deployments").del();
    await nodeDb("states").del();
  });

  describe("/nft-by-owner", () => {
    it("should fetch empty list ", async () => {
      const response = await request(app.callback()).get(
        "/nft-by-owner?ownerAddress=a"
      );
      expect(response.status).toBe(200);
      expect(response.body.contracts.length).toBe(0);
    });

    it("should fail if ownerAddress not passed", async () => {
      const response = await request(app.callback()).get("/nft-by-owner");
      expect(response.status).toBe(500);
    });

    it("should return contracts 'Indexed-By' 'atomic-asset' on given owner", async () => {
      const dbUpdates = new DbUpdates(nodeDb);

      await dbUpdates.upsertDeployment("1", ["atomic-asset"]);
      await dbUpdates.upsertState(
        "1",
        "2",
        {
          owner: "ALICE",
        },
        "node1",
        "sig_by_node_1",
        "{}",
        "hash"
      );

      const response = await request(app.callback()).get(
        "/nft-by-owner?ownerAddress=ALICE"
      );
      expect(response.status).toBe(200);
      expect(response.body.contracts.length).toBe(1);
    });

    it("should return contracts 'Indexed-By' 'atomic-asset' on given owner, when many indexes", async () => {
      const dbUpdates = new DbUpdates(nodeDb);

      await dbUpdates.upsertDeployment("1", ["atomic-asset", "b", "c"]);
      await dbUpdates.upsertState(
        "1",
        "2",
        {
          owner: "ALICE",
        },
        "node1",
        "sig_by_node_1",
        "{}",
        "hash"
      );

      const response = await request(app.callback()).get(
        "/nft-by-owner?ownerAddress=ALICE"
      );
      expect(response.status).toBe(200);
      expect(response.body.contracts.length).toBe(1);
    });

    it("should return many contracts 'Indexed-By' 'atomic-asset' on given owner, when many indexes", async () => {
      const dbUpdates = new DbUpdates(nodeDb);

      await dbUpdates.upsertDeployment("1", ["atomic-asset", "b", "c"]);
      await dbUpdates.upsertState(
        "1",
        "2",
        {
          owner: "ALICE",
        },
        "node1",
        "sig_by_node_1",
        "{}",
        "hash"
      );

      await dbUpdates.upsertDeployment("2", ["atomic-asset", "b", "c"]);
      await dbUpdates.upsertState(
        "2",
        "2",
        {
          owner: "ALICE",
        },
        "node1",
        "sig_by_node_1",
        "{}",
        "hash"
      );

      await dbUpdates.upsertDeployment("3", ["3", "b", "c"]);
      await dbUpdates.upsertState(
        "2",
        "2",
        {
          owner: "ALICE",
        },
        "node1",
        "sig_by_node_1",
        "{}",
        "hash"
      );

      await dbUpdates.upsertDeployment("4", ["atomic-asset", "b", "c"]);
      await dbUpdates.upsertState(
        "4",
        "2",
        {
          owner: "BOB",
        },
        "node1",
        "sig_by_node_1",
        "{}",
        "hash"
      );

      const response = await request(app.callback()).get(
        "/nft-by-owner?ownerAddress=ALICE"
      );
      expect(response.status).toBe(200);
      expect(response.body.contracts.length).toBe(2);
    });
  });

  describe("/interactions-by-indexes", () => {
    it("should fetch empty list of interactions", async () => {
      const response = await request(app.callback()).get(
        "/interactions-by-indexes?indexes=1;2"
      );
      expect(response.status).toBe(200);
      expect(response.body.interactions.length).toBe(0);
    });

    it("should fail, if 0 indexes passed", async () => {
      const response = await request(app.callback()).get(
        "/interactions-by-indexes"
      );
      expect(response.status).toBe(500);

      expect(response.text).toBe("Please provide at least one index");
    });

    it("should return by last index", async () => {
      const dbUpdates = new DbUpdates(nodeDb);

      await dbUpdates.upsertInteraction("1", "11", "alice", 100, [
        "add",
        "log",
        "ala",
        "ma",
        "kota",
      ]);

      await dbUpdates.upsertInteraction("2", "112", "alice", 100, [
        "add",
        "log",
        "ala",
        "ma",
        "kota2",
      ]);

      const response = await request(app.callback()).get(
        "/interactions-by-indexes?indexes=kota"
      );
      expect(response.status).toBe(200);

      expect(response.body.interactions).toEqual([
        {
          block_height: 100,
          contract_tx_id: "1",
          id: "11",
          owner_address: "alice",
          tag_index_0: "add",
          tag_index_1: "log",
          tag_index_2: "ala",
          tag_index_3: "ma",
          tag_index_4: "kota",
        },
      ]);
    });

    it("should return by first index", async () => {
      const dbUpdates = new DbUpdates(nodeDb);

      await dbUpdates.upsertInteraction("1", "11", "alice", 100, [
        "add",
        "log",
        "ala",
        "ma",
        "kota",
      ]);

      await dbUpdates.upsertInteraction("2", "112", "alice", 100, [
        "add2",
        "log",
        "ala",
        "ma",
        "kota2",
      ]);

      const response = await request(app.callback()).get(
        "/interactions-by-indexes?indexes=add2"
      );
      expect(response.status).toBe(200);

      expect(response.body.interactions).toEqual([
        {
          block_height: 100,
          contract_tx_id: "2",
          id: "112",
          owner_address: "alice",
          tag_index_0: "add2",
          tag_index_1: "log",
          tag_index_2: "ala",
          tag_index_3: "ma",
          tag_index_4: "kota2",
        },
      ]);
    });

    it("should return nothing if index does not match", async () => {
      const dbUpdates = new DbUpdates(nodeDb);

      await dbUpdates.upsertInteraction("1", "11", "alice", 100, [
        "add",
        "log",
        "ala",
        "ma",
        "kota",
      ]);

      await dbUpdates.upsertInteraction("2", "112", "alice", 100, [
        "add2",
        "log",
        "ala",
        "ma",
        "kota2",
      ]);

      const response = await request(app.callback()).get(
        "/interactions-by-indexes?indexes=pies"
      );
      expect(response.status).toBe(200);

      expect(response.body.interactions).toEqual([]);
    });

    it("should return only interaction matching two indexes", async () => {
      const dbUpdates = new DbUpdates(nodeDb);

      await dbUpdates.upsertInteraction("1", "11", "alice", 100, [
        "add",
        "log",
        "ala",
        "ma",
        "kota",
      ]);

      await dbUpdates.upsertInteraction("2", "112", "alice", 100, [
        "add2",
        "log",
        "ala2",
        "ma",
        "kota2",
      ]);

      await dbUpdates.upsertInteraction("2", "1123", "alice", 100, [
        "add2",
        "log",
        "ala2",
        "ma",
        "kota2",
      ]);

      const response = await request(app.callback()).get(
        "/interactions-by-indexes?indexes=ala2;kota2"
      );
      expect(response.status).toBe(200);

      expect(response.body.interactions).toEqual([
        {
          block_height: 100,
          contract_tx_id: "2",
          id: "112",
          owner_address: "alice",
          tag_index_0: "add2",
          tag_index_1: "log",
          tag_index_2: "ala2",
          tag_index_3: "ma",
          tag_index_4: "kota2",
        },
        {
          block_height: 100,
          contract_tx_id: "2",
          id: "1123",
          owner_address: "alice",
          tag_index_0: "add2",
          tag_index_1: "log",
          tag_index_2: "ala2",
          tag_index_3: "ma",
          tag_index_4: "kota2",
        },
      ]);
    });
  });
});
