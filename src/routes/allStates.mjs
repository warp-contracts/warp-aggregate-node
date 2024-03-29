const MAX_STATES_PER_PAGE = 1000;

const allowedOrderingColumns = ["contract_tx_id", "sort_key"];
const allowedOrders = ["asc", "desc"];

export const allStates = async (ctx) => {
  const { page, limit, orderBy, order, id, index } = ctx.query;

  const nodeDb = ctx.nodeDb;

  if (allowedOrderingColumns.indexOf(orderBy) == -1) {
    ctx.body = `Wrong order column, allowed ${allowedOrderingColumns}`;
    ctx.status = 500;
    return;
  }
  if (allowedOrders.indexOf(order) == -1) {
    ctx.body = `Wrong order, allowed ${allowedOrders}`;
    ctx.status = 500;
    return;
  }

  const parsedPage = page ? parseInt(page) : 1;
  const parsedLimit = limit
    ? Math.min(parseInt(limit), MAX_STATES_PER_PAGE)
    : MAX_STATES_PER_PAGE;
  const offset = parsedPage ? (parsedPage - 1) * parsedLimit : 0;

  const bindings = [];
  if (id) {
    bindings.push(id);
  }
  bindings.push(parsedLimit);
  bindings.push(offset);

  let parsedOrderBy = null;
  if (orderBy == "contract_tx_id") {
    parsedOrderBy = `s.contract_tx_id ${order}`;
  } else if (orderBy == "sort_key") {
    parsedOrderBy = `s.sort_key ${order}, s.contract_tx_id ${order}`;
  }

  try {
    const result = await nodeDb.raw(
      `
        WITH indexed_contracts AS (
            SELECT contract_tx_id FROM deployments d WHERE '${index}' = d.tag_index_0
        )
          SELECT s.contract_tx_id,
                 s.sort_key,
                 s.state,
                 s.state_hash,
                 s.node,
                 s.signature,
                 s.manifest
          FROM states s WHERE s.contract_tx_id IN (select contract_tx_id from indexed_contracts)
          ORDER BY ${parsedOrderBy}
              LIMIT ?
          OFFSET ?
      `,
      bindings
    );

    const resultTotal = await nodeDb.raw(
      `select count(*) as total
       from states`
    );

    ctx.body = {
      paging: {
        total: resultTotal[0].total,
        limit: parsedLimit,
        items: result?.length,
        page: parsedPage
      },
      states: result
    };
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};
