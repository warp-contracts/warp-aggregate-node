import knex from "knex";
import { createNodeDbTables } from "../src/db/initDb.mjs";
import { createApp } from "../src/app.mjs";
import request from 'supertest';
import { DbUpdates } from "../src/db/DbUpdates.mjs";

describe('routes tests', () => {
    describe('/interactions-by-indexes', () => {
        let nodeDb;
        let app;

        beforeAll(async () => {
            nodeDb = knex({
                client: 'better-sqlite3',
                connection: ':memory:',
                useNullAsDefault: true,
            });
            app = createApp(nodeDb);
            await createNodeDbTables(nodeDb);
        });

        afterAll(async () => {
            await nodeDb.destroy()
        })

        afterEach(async () => {
            await nodeDb('interactions').del()
        })

        it('should fetch empty list of interactions', async () => {
            const response = await request(app.callback()).get('/interactions-by-indexes?indexes=1;2');
            expect(response.status).toBe(200);
            expect(response.body.interactions.length).toBe(0);
        });

        it('should fail, if 0 indexes passed', async () => {
            const response = await request(app.callback()).get('/interactions-by-indexes');
            expect(response.status).toBe(500);

            expect(response.text).toBe('Please provide at least one index');
        });

        it('should return by last index', async () => {
            const dbUpdates = new DbUpdates(nodeDb);

            await dbUpdates.upsertInteraction(
                "1",
                "11",
                "alice",
                100,
                ["add", "log", "ala", "ma", "kota"]
            )

            await dbUpdates.upsertInteraction(
                "2",
                "112",
                "alice",
                100,
                ["add", "log", "ala", "ma", "kota2"]
            )

            const response = await request(app.callback()).get('/interactions-by-indexes?indexes=kota');
            expect(response.status).toBe(200);

            expect(response.body.interactions).toEqual([
                { "block_height": 100, "contract_tx_id": "1", "id": "11", "owner_address": "alice", "tag_index_0": "add", "tag_index_1": "log", "tag_index_2": "ala", "tag_index_3": "ma", "tag_index_4": "kota" }
            ]);
        })

        it('should return by first index', async () => {
            const dbUpdates = new DbUpdates(nodeDb);

            await dbUpdates.upsertInteraction(
                "1",
                "11",
                "alice",
                100,
                ["add", "log", "ala", "ma", "kota"]
            )

            await dbUpdates.upsertInteraction(
                "2",
                "112",
                "alice",
                100,
                ["add2", "log", "ala", "ma", "kota2"]
            )

            const response = await request(app.callback()).get('/interactions-by-indexes?indexes=add2');
            expect(response.status).toBe(200);

            expect(response.body.interactions).toEqual([
                { "block_height": 100, "contract_tx_id": "2", "id": "112", "owner_address": "alice", "tag_index_0": "add2", "tag_index_1": "log", "tag_index_2": "ala", "tag_index_3": "ma", "tag_index_4": "kota2" }
            ]);
        });

        it('should return nothing if index does not match', async () => {
            const dbUpdates = new DbUpdates(nodeDb);

            await dbUpdates.upsertInteraction(
                "1",
                "11",
                "alice",
                100,
                ["add", "log", "ala", "ma", "kota"]
            )

            await dbUpdates.upsertInteraction(
                "2",
                "112",
                "alice",
                100,
                ["add2", "log", "ala", "ma", "kota2"]
            )

            const response = await request(app.callback()).get('/interactions-by-indexes?indexes=pies');
            expect(response.status).toBe(200);

            expect(response.body.interactions).toEqual([]);
        });

        it('should return only interaction matching two indexes', async () => {
            const dbUpdates = new DbUpdates(nodeDb);

            await dbUpdates.upsertInteraction(
                "1",
                "11",
                "alice",
                100,
                ["add", "log", "ala", "ma", "kota"]
            )

            await dbUpdates.upsertInteraction(
                "2",
                "112",
                "alice",
                100,
                ["add2", "log", "ala2", "ma", "kota2"]
            )

            await dbUpdates.upsertInteraction(
                "2",
                "1123",
                "alice",
                100,
                ["add2", "log", "ala2", "ma", "kota2"]
            )

            const response = await request(app.callback()).get('/interactions-by-indexes?indexes=ala2;kota2');
            expect(response.status).toBe(200);

            expect(response.body.interactions).toEqual([
                { "block_height": 100, "contract_tx_id": "2", "id": "112", "owner_address": "alice", "tag_index_0": "add2", "tag_index_1": "log", "tag_index_2": "ala2", "tag_index_3": "ma", "tag_index_4": "kota2" },
                { "block_height": 100, "contract_tx_id": "2", "id": "1123", "owner_address": "alice", "tag_index_0": "add2", "tag_index_1": "log", "tag_index_2": "ala2", "tag_index_3": "ma", "tag_index_4": "kota2" }
            ]);
        });
    });

})