import { create } from 'zustand';
import dayjs from 'dayjs';

// Define types for the report data
interface AccountBalance {
    id: number;
    name: string;
    type: string;
    totalDebit: number;
    totalCredit: number;
    balance: number;
}

interface IncomeStatement {
    revenueAccounts: { id: number, name: string, balance: number }[];
    expenseAccounts: { id: number, name: string, balance: number }[];
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
}


interface ReportsState {
  accountBalances: AccountBalance[];
  incomeStatement: IncomeStatement | null;
  loading: boolean;
  error: string | null;
  dateRange: { from: string, to: string };
  setDateRange: (from: string, to: string) => void;
  fetchAccountBalances: () => Promise<void>;
  fetchIncomeStatement: () => Promise<void>;
}

export const useReportsStore = create<ReportsState>((set, get) => ({
  accountBalances: [],
  incomeStatement: null,
  loading: false,
  error: null,
  dateRange: {
    from: dayjs().startOf('year').format('YYYY-MM-DD'),
    to: dayjs().endOf('year').format('YYYY-MM-DD'),
  },

  setDateRange: (from: string, to: string) => {
    set({ dateRange: { from, to } });
  },

  fetchAccountBalances: async () => {
    set({ loading: true, error: null });
    try {
      const balances = await window.electronAPI.reports.getAccountBalances();
      set({ accountBalances: balances, loading: false });
    } catch (err) {
        const error = err instanceof Error ? err.message : 'An unknown error occurred';
        set({ error, loading: false });
    }
  },

  fetchIncomeStatement: async () => {
    const { dateRange } = get();
    set({ loading: true, error: null });
    try {
        const statement = await window.electronAPI.reports.getIncomeStatement(dateRange);
        set({ incomeStatement: statement, loading: false });
    } catch (err) {
        const error = err instanceof Error ? err.message : 'An unknown error occurred';
        set({ error, loading: false });
    }
  }
}));
