import React, { useEffect, useState } from 'react';
import { useVoucherStore } from '../store/useVoucherStore';
import { useAccountStore } from '../store/useAccountStore';
import { usePartyStore } from '../store/usePartyStore';
import { usePartnerStore } from '../store/usePartnerStore';

import { Button } from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';
import { VoucherForm } from '@/components/vouchers/VoucherForm';

const VouchersPage: React.FC = () => {
  const { vouchers, loading, error, fetchVouchers, deleteVoucher } = useVoucherStore();
  const { fetchAccounts } = useAccountStore();
  const { fetchParties } = usePartyStore();
  const { fetchPartners } = usePartnerStore();

  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    // Fetch all necessary data for the form dropdowns and the list view
    fetchVouchers();
    fetchAccounts();
    fetchParties();
    fetchPartners();
  }, [fetchVouchers, fetchAccounts, fetchParties, fetchPartners]);

  const handleDelete = async (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا السند؟ سيتم حذف القيود المرتبطة به أيضاً.')) {
      await deleteVoucher(id);
    }
  };

  const kindToArabic = (kind: 'receipt' | 'payment') => {
    return kind === 'receipt' ? 'قبض' : 'صرف';
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">سندات الخزينة</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <PlusCircle className="ml-2 h-4 w-4" />
          إضافة سند جديد
        </Button>
      </div>

      <VoucherForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
      />

      {loading && <p>جاري التحميل...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">التاريخ</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">النوع</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الحساب</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الطرف</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">المبلغ</th>
                    <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                    </th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {vouchers.map((voucher) => (
                    <tr key={voucher.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{voucher.date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{kindToArabic(voucher.kind)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{voucher.accountName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{voucher.partyName || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">{voucher.amount.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                            {/* Update is not fully implemented yet */}
                            {/* <Button variant="ghost" size="sm" onClick={() => {}}>تعديل</Button> */}
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(voucher.id)}>حذف</Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        {vouchers.length === 0 && !loading && (
            <div className="text-center py-12">
                <p>لم يتم العثور على سندات. ابدأ بإضافة سند جديد.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default VouchersPage;
