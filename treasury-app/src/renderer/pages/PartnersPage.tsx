import React, { useEffect, useState } from 'react';
import { usePartnerStore } from '../store/usePartnerStore';
import { Button } from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';
import { PartnerForm } from '@/components/partners/PartnerForm';
import type { Partner } from '@shared/shared-types';

const PartnersPage: React.FC = () => {
  const { partners, loading, error, fetchPartners, deletePartner } = usePartnerStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleAddPartner = () => {
    setSelectedPartner(null);
    setIsFormOpen(true);
  };

  const handleEditPartner = (partner: Partner) => {
    setSelectedPartner(partner);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا الشريك؟')) {
      const success = await deletePartner(id);
      if (!success) {
        alert('فشل حذف الشريك. قد يكون مرتبطًا بعمليات حالية.');
      }
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">إدارة الشركاء</h1>
        <Button onClick={handleAddPartner}>
          <PlusCircle className="ml-2 h-4 w-4" />
          إضافة شريك جديد
        </Button>
      </div>

      <PartnerForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        partnerToEdit={selectedPartner}
      />

      {loading && <p>جاري التحميل...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الاسم</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">الهاتف</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">رصيد افتتاحي</th>
                    <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                    </th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {partners.map((partner) => (
                    <tr key={partner.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{partner.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{partner.phone}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{partner.openingBalance}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                            <Button variant="ghost" size="sm" onClick={() => handleEditPartner(partner)}>تعديل</Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(partner.id)}>حذف</Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        {partners.length === 0 && !loading && (
            <div className="text-center py-12">
                <p>لم يتم العثور على شركاء. ابدأ بإضافة شريك جديد.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default PartnersPage;
