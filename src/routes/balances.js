const MAX_BALANCES_PER_PAGE = 1000;

export const walletBalances = async (ctx) => {
  const { page, limit, walletAddress } = ctx.query;
  const nodeDb = ctx.nodeDb;

  const parsedPage = page ? parseInt(page) : 1;
  const parsedLimit = limit
    ? Math.min(parseInt(limit), MAX_BALANCES_PER_PAGE)
    : MAX_BALANCES_PER_PAGE;
  const offset = parsedPage ? (parsedPage - 1) * parsedLimit : 0;

  try {
    const result = await nodeDb.raw(
      `
        SELECT contract_tx_id, token_ticker, token_name, balance, sort_key
        FROM balances
        WHERE wallet_address = ?
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
