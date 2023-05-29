const MAX_BALANCES_PER_PAGE = 1000;

export const walletBalances = async (ctx) => {
  const { page, limit, walletAddress, index, noIndex } = ctx.query;
  const nodeDb = ctx.nodeDb;

  const parsedPage = page ? parseInt(page) : 1;
  const parsedLimit = limit ? Math.min(parseInt(limit), MAX_BALANCES_PER_PAGE) : MAX_BALANCES_PER_PAGE;
  const offset = parsedPage ? (parsedPage - 1) * parsedLimit : 0;

  if (index && noIndex && index == noIndex) {
    ctx.body = 'index and noIndex params values cannot be the same.';
    ctx.status = 500;
    return;
  }

  try {
    const result = await nodeDb.raw(
      `
        SELECT b.contract_tx_id, b.token_ticker, b.token_name, b.balance, b.sort_key
        FROM balances b
        ${index != null || noIndex != null ? 'LEFT JOIN deployments d on d.contract_tx_id = b.contract_tx_id' : ''}
        WHERE wallet_address = ? ${
          index != null
            ? `AND '${index}' IN (d.tag_index_0, d.tag_index_1, d.tag_index_2, d.tag_index_3, d.tag_index_4)`
            : ''
        } ${
        noIndex != null
          ? `AND COALESCE(d.tag_index_0, '') <> '${noIndex}'
          AND COALESCE(d.tag_index_1, '') <> '${noIndex}' 
          AND COALESCE(d.tag_index_2, '') <> '${noIndex}' 
          AND COALESCE(d.tag_index_3, '') <> '${noIndex}' 
          AND COALESCE(d.tag_index_4, '') <> '${noIndex}'`
          : ''
      }
        ORDER BY sort_key desc
        LIMIT ? OFFSET ?
    `,
      [walletAddress, parsedLimit, offset]
    );
    ctx.body = {
      paging: {
        limit: parsedLimit,
        items: result?.length,
        page: parsedPage,
      },
      balances: result,
    };
    ctx.status = 200;
  } catch (e) {
    ctx.body = e.message;
    ctx.status = 500;
  }
};
