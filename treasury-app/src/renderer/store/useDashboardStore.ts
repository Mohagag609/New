import { create } from 'zustand';
import dayjs from 'dayjs';

interface KpiData {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  currentBalance: number;
}

interface ChartData {
    month: string;
    revenue: number;
    expenses: number;
}

interface DashboardState {
  kpis: KpiData;
  chartData: ChartData[];
  loading: boolean;
  error: string | null;
  dateRange: { from: string, to: string };
  setDateRange: (from: string, to: string) => void;
  fetchDashboardData: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  kpis: { totalRevenue: 0, totalExpenses: 0, netIncome: 0, currentBalance: 0 },
  chartData: [],
  loading: false,
  error: null,
  dateRange: {
    from: dayjs().startOf('month').format('YYYY-MM-DD'),
    to: dayjs().endOf('month').format('YYYY-MM-DD'),
  },

  setDateRange: (from: string, to: string) => {
    set({ dateRange: { from, to } });
    get().fetchDashboardData();
  },

  fetchDashboardData: async () => {
    const { dateRange } = get();
    set({ loading: true, error: null });
    try {
      const [kpis, chartData] = await Promise.all([
        window.electronAPI.dashboard.getKpis(dateRange),
        window.electronAPI.dashboard.getChartData(dateRange)
      ]);
      set({ kpis, chartData, loading: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to fetch dashboard data:', error);
    }
  },
}));
