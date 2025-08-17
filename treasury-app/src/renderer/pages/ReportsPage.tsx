import React, { useEffect, useState } from 'react';
import { useReportsStore } from '../store/useReportsStore';
import { Button } from '@/components/ui/Button';

type ReportType = 'balances' | 'incomeStatement';

const ReportsPage: React.FC = () => {
  const {
    accountBalances, incomeStatement, loading, error,
    fetchAccountBalances, fetchIncomeStatement,
    dateRange, setDateRange
  } = useReportsStore();

  const [activeReport, setActiveReport] = useState<ReportType>('balances');

  useEffect(() => {
    if (activeReport === 'balances') {
      fetchAccountBalances();
    } else if (activeReport === 'incomeStatement') {
      fetchIncomeStatement();
    }
  }, [activeReport, fetchAccountBalances, fetchIncomeStatement]);

  const handleRunIncomeStatement = () => {
    fetchIncomeStatement();
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">التقارير</h1>
        <div className="flex gap-2">
            <Button variant={activeReport === 'balances' ? 'default' : 'secondary'} onClick={() => setActiveReport('balances')}>أرصدة الحسابات</Button>
            <Button variant={activeReport === 'incomeStatement' ? 'default' : 'secondary'} onClick={() => setActiveReport('incomeStatement')}>كشف الدخل</Button>
        </div>
      </div>

      {loading && <p>جاري التحميل...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {activeReport === 'balances' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-right">الحساب</th>
                <th className="px-6 py-3 text-right">النوع</th>
                <th className="px-6 py-3 text-right">إجمالي المدين</th>
                <th className="px-6 py-3 text-right">إجمالي الدائن</th>
                <th className="px-6 py-3 text-right">الرصيد الحالي</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {accountBalances.map(acc => (
                <tr key={acc.id}>
                  <td className="px-6 py-4">{acc.name}</td>
                  <td className="px-6 py-4">{acc.type}</td>
                  <td className="px-6 py-4">{formatCurrency(acc.totalDebit)}</td>
                  <td className="px-6 py-4">{formatCurrency(acc.totalCredit)}</td>
                  <td className="px-6 py-4 font-bold">{formatCurrency(acc.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeReport === 'incomeStatement' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            <div className="flex items-center gap-4">
                <input type="date" value={dateRange.from} onChange={e => setDateRange(e.target.value, dateRange.to)} className="input-class-if-any" />
                <span>إلى</span>
                <input type="date" value={dateRange.to} onChange={e => setDateRange(dateRange.from, e.target.value)} className="input-class-if-any" />
                <Button onClick={handleRunIncomeStatement}>عرض التقرير</Button>
            </div>
            {incomeStatement && (
                <div>
                    <h2 className="text-xl font-bold mb-2">الإيرادات</h2>
                    {incomeStatement.revenueAccounts.map(acc => <div key={acc.id} className="flex justify-between"><span>{acc.name}</span><span>{formatCurrency(acc.balance)}</span></div>)}
                    <div className="flex justify-between font-bold mt-2 border-t pt-2"><span>إجمالي الإيرادات</span><span>{formatCurrency(incomeStatement.totalRevenue)}</span></div>

                    <h2 className="text-xl font-bold mt-6 mb-2">المصروفات</h2>
                    {incomeStatement.expenseAccounts.map(acc => <div key={acc.id} className="flex justify-between"><span>{acc.name}</span><span>{formatCurrency(acc.balance)}</span></div>)}
                    <div className="flex justify-between font-bold mt-2 border-t pt-2"><span>إجمالي المصروفات</span><span>{formatCurrency(incomeStatement.totalExpenses)}</span></div>

                    <div className="flex justify-between font-bold text-xl mt-6 border-t-2 pt-4"><span>صافي الدخل</span><span>{formatCurrency(incomeStatement.netIncome)}</span></div>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
