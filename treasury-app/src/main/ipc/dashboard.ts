import db from '../db';
import dayjs from 'dayjs';

interface DateRange {
  from: string;
  to: string;
}

export async function getKpis(range: DateRange) {
  const { from, to } = range;

  // 1. Total Revenue
  const revenueResult = db.prepare(`
    SELECT TOTAL(e.credit) as total
    FROM entries e
    JOIN accounts a ON e.account_id = a.id
    WHERE a.type = 'revenue' AND e.date BETWEEN ? AND ?
  `).get(from, to) as { total: number };
  const totalRevenue = revenueResult?.total || 0;

  // 2. Total Expenses
  const expenseResult = db.prepare(`
    SELECT TOTAL(e.debit) as total
    FROM entries e
    JOIN accounts a ON e.account_id = a.id
    WHERE a.type = 'expense' AND e.date BETWEEN ? AND ?
  `).get(from, to) as { total: number };
  const totalExpenses = expenseResult?.total || 0;

  // 3. Net Income
  const netIncome = totalRevenue - totalExpenses;

  // 4. Current Balances (of assets)
  const balanceResult = db.prepare(`
    SELECT (SUM(e.debit) - SUM(e.credit)) as total
    FROM entries e
    JOIN accounts a ON e.account_id = a.id
    WHERE a.type IN ('asset', 'bank', 'cash')
  `).get() as { total: number };
  const currentBalance = balanceResult?.total || 0;

  return {
    totalRevenue,
    totalExpenses,
    netIncome,
    currentBalance,
  };
}

export async function getMonthlyChartData(range: DateRange) {
    const { from, to } = range;
    const revenueData = db.prepare(`
        SELECT strftime('%Y-%m', date) as month, SUM(credit) as total
        FROM entries e JOIN accounts a ON e.account_id = a.id
        WHERE a.type = 'revenue' AND e.date BETWEEN ? AND ?
        GROUP BY month
        ORDER BY month
    `).all(from, to);

    const expenseData = db.prepare(`
        SELECT strftime('%Y-%m', date) as month, SUM(debit) as total
        FROM entries e JOIN accounts a ON e.account_id = a.id
        WHERE a.type = 'expense' AND e.date BETWEEN ? AND ?
        GROUP BY month
        ORDER BY month
    `).all(from, to);

    const combinedData: { [month: string]: { month: string, revenue: number, expenses: number } } = {};

    revenueData.forEach((row: any) => {
        if (!combinedData[row.month]) {
            combinedData[row.month] = { month: row.month, revenue: 0, expenses: 0 };
        }
        combinedData[row.month].revenue = row.total;
    });

    expenseData.forEach((row: any) => {
        if (!combinedData[row.month]) {
            combinedData[row.month] = { month: row.month, revenue: 0, expenses: 0 };
        }
        combinedData[row.month].expenses = row.total;
    });

    return Object.values(combinedData).sort((a, b) => a.month.localeCompare(b.month));
}
