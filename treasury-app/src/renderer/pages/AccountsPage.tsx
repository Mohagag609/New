import React, { useEffect, useState } from 'react';
import { useAccountStore } from '../store/useAccountStore';
import { Button } from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';
import { AccountForm } from '@/components/accounts/AccountForm';
import type { Account } from '@/shared-types';

const AccountsPage: React.FC = () => {
  const { accounts, loading, error, fetchAccounts, deleteAccount } = useAccountStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleAddAccount = () => {
    setSelectedAccount(null);
    setIsFormOpen(true);
  };

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    const associatedAccounts = accounts.filter(a => a.parentId === id);
    if (associatedAccounts.length > 0) {
        alert('لا يمكن حذف هذا الحساب لأنه حساب رئيسي لحسابات أخرى.');
        return;
    }
    if (confirm('هل أنت متأكد من حذف هذا الحساب؟ لا يمكن التراجع عن هذا الإجراء.')) {
      const success = await deleteAccount(id);
      if(!success) {
        alert('فشل حذف الحساب. قد يكون مرتبطًا بحركات مالية.');
      }
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">شجرة الحسابات</h1>
        <Button onClick={handleAddAccount}>
          <PlusCircle className="ml-2 h-4 w-4" />
          إضافة حساب جديد
        </Button>
      </div>

      <AccountForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        accountToEdit={selectedAccount}
      />

      {loading && <p>جاري التحميل...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الاسم</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">النوع</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الحساب الرئيسي</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الحالة</th>
                    <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                    </th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {accounts.map((account) => (
                    <tr key={account.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{account.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{account.type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{accounts.find(a => a.id === account.parentId)?.name || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${account.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {account.active ? 'نشط' : 'غير نشط'}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                            <Button variant="ghost" size="sm" onClick={() => handleEditAccount(account)}>تعديل</Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(account.id)}>حذف</Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        {accounts.length === 0 && !loading && (
            <div className="text-center py-12">
                <p>لم يتم العثور على حسابات. ابدأ بإضافة حساب جديد.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default AccountsPage;
