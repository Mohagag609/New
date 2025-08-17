import React, { useEffect, useState } from 'react';
import { usePartyStore } from '../store/usePartyStore';
import { Button } from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';
import { PartyForm } from '@/components/parties/PartyForm';
import type { Party } from '@/shared-types';

const PartiesPage: React.FC = () => {
  const { parties, loading, error, fetchParties, deleteParty } = usePartyStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);

  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  const handleAddParty = () => {
    setSelectedParty(null);
    setIsFormOpen(true);
  };

  const handleEditParty = (party: Party) => {
    setSelectedParty(party);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا الطرف؟')) {
      const success = await deleteParty(id);
      if (!success) {
        alert('فشل حذف الطرف. قد يكون مرتبطًا بسندات.');
      }
    }
  };

  const kindToArabic = (kind: 'customer' | 'vendor') => {
    return kind === 'customer' ? 'عميل' : 'مورد';
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">العملاء والموردون</h1>
        <Button onClick={handleAddParty}>
          <PlusCircle className="ml-2 h-4 w-4" />
          إضافة طرف جديد
        </Button>
      </div>

      <PartyForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        partyToEdit={selectedParty}
      />

      {loading && <p>جاري التحميل...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الاسم</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">النوع</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الهاتف</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">رصيد افتتاحي</th>
                    <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                    </th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {parties.map((party) => (
                    <tr key={party.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{party.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{kindToArabic(party.kind)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{party.phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{party.openingBalance}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                            <Button variant="ghost" size="sm" onClick={() => handleEditParty(party)}>تعديل</Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(party.id)}>حذف</Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        {parties.length === 0 && !loading && (
            <div className="text-center py-12">
                <p>لم يتم العثور على أطراف. ابدأ بإضافة عميل أو مورد جديد.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default PartiesPage;
