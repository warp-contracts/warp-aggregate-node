const MAX_INTERACTIONS_PER_PAGE = 1000;

export const interactions = async (ctx) => {
  const { page, limit, ownerAddress, indexes, contractTxId } = ctx.query;
  const nodeDb = ctx.nodeDb;

  const parsedPage = page ? parseInt(page) : 1;
  const parsedLimit = limit
    ? Math.min(parseInt(limit), MAX_INTERACTIONS_PER_PAGE)
    : MAX_INTERACTIONS_PER_PAGE;
  const offset = parsedPage ? (parsedPage - 1) * parsedLimit : 0;

  const bindings = [];
  if (ownerAddress) {
    bindings.push(ownerAddress);
  }
  if (contractTxId) {
    bindings.push(contractTxId);
  }

  try {
    const parsedIndexes = parseIndexes(indexes);
    let indexQuery = `WHERE ? IN (tag_index_0, tag_index_1, tag_index_2, tag_index_3, tag_index_4)`;
    bindings.push(parsedIndexes.shift());

    for (const index of parsedIndexes) {
      indexQuery += `AND ? IN (tag_index_0, tag_index_1, tag_index_2, tag_index_3, tag_index_4)`;
      bindings.push(index);
    }

    const result = await nodeDb.raw(
      `
        SELECT id, contract_tx_id, block_height, owner_address, tag_index_0, tag_index_1, tag_index_2, tag_index_3, tag_index_4 
        FROM interactions
        ${ownerAddress ? "WHERE owner_address = ?" : ""}
        ${contractTxId ? "WHERE contract_tx_id = ?" : ""}
        ${indexQuery}
        ORDER BY block_height desc
        LIMIT ? OFFSET ?
    `,
      [...bindings, parsedLimit, offset]
    );

    ctx.body = {
      paging: {
        limit: parsedLimit,
        items: result?.length,
        page: parsedPage,
      },
      interactions: result,
    };

    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};

function parseIndexes(indexes) {
  if (!indexes) {
    throw Error("Please provide at least one index");
  }

  const parsedIndexes = indexes.split(";");

  if (parsedIndexes.length === 0) {
    throw Error("Please provide at least one index");
  }

  return parsedIndexes;
}
