import db from '../db';

export async function getAccountBalances() {
  const query = `
    SELECT
      a.id,
      a.name,
      a.type,
      IFNULL(SUM(e.debit), 0) as totalDebit,
      IFNULL(SUM(e.credit), 0) as totalCredit,
      (IFNULL(SUM(e.debit), 0) - IFNULL(SUM(e.credit), 0)) as balance
    FROM accounts a
    LEFT JOIN entries e ON a.id = e.account_id
    GROUP BY a.id, a.name, a.type
    ORDER BY a.name
  `;
  const balances = db.prepare(query).all();
  return balances;
}

export async function getIncomeStatement(range: { from: string, to: string }) {
    const { from, to } = range;

    const revenueAccounts = db.prepare(`
        SELECT a.id, a.name, (SUM(e.credit) - SUM(e.debit)) as balance
        FROM accounts a
        JOIN entries e ON a.id = e.account_id
        WHERE a.type = 'revenue' AND e.date BETWEEN ? AND ?
        GROUP BY a.id, a.name
    `).all(from, to);

    const expenseAccounts = db.prepare(`
        SELECT a.id, a.name, (SUM(e.debit) - SUM(e.credit)) as balance
        FROM accounts a
        JOIN entries e ON a.id = e.account_id
        WHERE a.type = 'expense' AND e.date BETWEEN ? AND ?
        GROUP BY a.id, a.name
    `).all(from, to);

    const totalRevenue = revenueAccounts.reduce((sum, acc) => sum + (acc as any).balance, 0);
    const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + (acc as any).balance, 0);

    return {
        revenueAccounts,
        expenseAccounts,
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses
    };
}
