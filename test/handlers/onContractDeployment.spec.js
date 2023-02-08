import knex from "knex";
import { readFileSync } from "fs";
import { join } from "path";
import { DbUpdates } from "../../src/db/DbUpdates";
import { createNodeDbTables } from "../../src/db/initDb.mjs";
import { onContractDeployment } from "../../src/handlers/onContractDeployment.mjs";

const DEPLOYMENT_MSG = JSON.parse(readFileSync(
    join(process.cwd(), "test", "__data__", "deployment_1.json")
));

const DEPLOYMENT_INDEXED = JSON.parse(readFileSync(
    join(process.cwd(), "test", "__data__", "deployment_indexed.json")
));


describe("on deployments", () => {
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
        await nodeDb("deployments").del();
    });

    it('should NOT save deployment to DB if missing TAG "Indexed-By"', async () => {
        const dbUpdates = new DbUpdates(nodeDb);

        await onContractDeployment(DEPLOYMENT_MSG, dbUpdates);

        const deployments = await nodeDb.raw("SELECT * FROM deployments");

        expect(deployments.length).toEqual(0);
    });

    it('should save interaction with tag "Indexed-By" to DB', async () => {
        const dbUpdates = new DbUpdates(nodeDb);

        await onContractDeployment(DEPLOYMENT_INDEXED, dbUpdates);

        const deployments = await nodeDb.raw("SELECT * FROM deployments");

        expect(deployments.length).toEqual(1);
        expect(deployments[0]).toEqual({
            contract_tx_id: "VFr3Bk-uM-motpNNkkFg4lNW1BMmSfzqsVO551Ho4hA",
            id: expect.any(Number),
            tag_index_0: "atomic-asset-warp",
            tag_index_1: "dens",
            tag_index_2: "a",
            tag_index_3: "c",
            tag_index_4: null,
        });
    });

    it("should dont save more then 5 tags", async () => {
        const dbUpdates = new DbUpdates(nodeDb);

        const message = DEPLOYMENT_INDEXED;
        message.tags = message.tags.map((tag) => {
            if (tag.name === "Indexed-By") {
                return {
                    name: "Indexed-By",
                    value: "1;2;3;4;5;6",
                };
            }
            return tag;
        });

        await onContractDeployment(message, dbUpdates);

        const deployments = await nodeDb.raw("SELECT * FROM deployments");

        expect(deployments.length).toEqual(1);
        expect(deployments[0]).toEqual({
            contract_tx_id: "VFr3Bk-uM-motpNNkkFg4lNW1BMmSfzqsVO551Ho4hA",
            id: expect.any(Number),
            tag_index_0: "1",
            tag_index_1: "2",
            tag_index_2: "3",
            tag_index_3: "4",
            tag_index_4: "5",
        });
    });
});
