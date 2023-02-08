const MAX_NFTS_PER_PAGE = 100;
const ATOMIC_ASSET_TAG_VALUE = 'atomic-asset';

export const taggedNftByOwner = async (ctx) => {
    const { page, limit, ownerAddress } = ctx.query;
    const nodeDb = ctx.nodeDb;

    const parsedPage = page ? parseInt(page) : 1;
    const parsedLimit = limit
        ? Math.min(parseInt(limit), MAX_NFTS_PER_PAGE)
        : MAX_NFTS_PER_PAGE;
    const offset = parsedPage ? (parsedPage - 1) * parsedLimit : 0;

    try {
        if (!ownerAddress) {
            throw Error(`"ownerAddress" param is required`)
        }

        const result = await nodeDb.raw(`
        SELECT states.contract_tx_id, states.state
        FROM states
        INNER JOIN deployments
        ON deployments.contract_tx_id = states.contract_tx_id
        WHERE ? IN (deployments.tag_index_0, deployments.tag_index_1, deployments.tag_index_2, deployments.tag_index_3, deployments.tag_index_4) 
        AND states.state->>'$.owner' = ?
        ORDER BY deployments.id ASC
        LIMIT ? OFFSET ?`,
            [ATOMIC_ASSET_TAG_VALUE, ownerAddress, parsedLimit, offset]
        );

        ctx.body = {
            paging: {
                limit: parsedLimit,
                items: result?.length,
                page: parsedPage,
            },
            contracts: result,
        };

        ctx.status = 200;
    } catch (e) {
        ctx.body = e.message;
        ctx.status = 500;
    }
};

