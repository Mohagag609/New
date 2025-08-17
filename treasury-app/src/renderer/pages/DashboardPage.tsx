import React, { useEffect } from 'react';
import { useDashboardStore } from '../store/useDashboardStore';
import { useVoucherStore, type VoucherListView } from '../store/useVoucherStore';
import { DollarSign, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const KpiCard = ({ title, value, icon: Icon }: { title: string, value: string, icon: React.ElementType }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                <Icon className="h-6 w-6" />
            </div>
            <div className="mr-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
            </div>
        </div>
    </div>
);

const DashboardPage: React.FC = () => {
  const { kpis, chartData, dateRange, loading, fetchDashboardData, setDateRange } = useDashboardStore();
  const { vouchers, fetchVouchers } = useVoucherStore();

  useEffect(() => {
    fetchDashboardData();
    fetchVouchers();
  }, [fetchDashboardData, fetchVouchers]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
             <h1 className="text-2xl font-bold">لوحة التحكم</h1>
             {/* TODO: Add date range picker */}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard title="الأرصدة الحالية" value={formatCurrency(kpis.currentBalance)} icon={Scale} />
            <KpiCard title="إجمالي الإيرادات" value={formatCurrency(kpis.totalRevenue)} icon={TrendingUp} />
            <KpiCard title="إجمالي المصروفات" value={formatCurrency(kpis.totalExpenses)} icon={TrendingDown} />
            <KpiCard title="صافي الدخل" value={formatCurrency(kpis.netIncome)} icon={DollarSign} />
        </div>

        {/* Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">الأداء الشهري</h2>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={formatCurrency} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="الإيرادات" stroke="#34d399" />
                    <Line type="monotone" dataKey="expenses" name="المصروفات" stroke="#f87171" />
                </LineChart>
            </ResponsiveContainer>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">أحدث الحركات</h2>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        <th className="px-4 py-2 text-right">التاريخ</th>
                        <th className="px-4 py-2 text-right">النوع</th>
                        <th className="px-4 py-2 text-right">الطرف</th>
                        <th className="px-4 py-2 text-right">المبلغ</th>
                    </tr>
                </thead>
                <tbody>
                    {vouchers.slice(0, 5).map((v: VoucherListView) => (
                        <tr key={v.id}>
                            <td className="px-4 py-2">{v.date}</td>
                            <td className="px-4 py-2">{v.kind === 'receipt' ? 'قبض' : 'صرف'}</td>
                            <td className="px-4 py-2">{v.partyName || '-'}</td>
                            <td className="px-4 py-2">{formatCurrency(v.amount)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default DashboardPage;
