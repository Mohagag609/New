import React, { useEffect, useState } from 'react';
import { useExpenseCategoryStore } from '../store/useExpenseCategoryStore';
import { Button } from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';
import { ExpenseCategoryForm } from '@/components/expenses/ExpenseCategoryForm';
import type { ExpenseCategory } from '@/shared-types';

const ExpensesPage: React.FC = () => {
  const { categories, loading, error, fetchCategories, deleteCategory } = useExpenseCategoryStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAddCategory = () => {
    setSelectedCategory(null);
    setIsFormOpen(true);
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    setSelectedCategory(category);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذه الفئة؟')) {
      const success = await deleteCategory(id);
      if (!success) {
        alert('فشل حذف الفئة. قد تكون مرتبطة ببنود مصروفات.');
      }
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">إدارة المصروفات</h1>
        <Button onClick={handleAddCategory}>
          <PlusCircle className="ml-2 h-4 w-4" />
          إضافة فئة جديدة
        </Button>
      </div>

      <p className="mb-4 text-gray-600 dark:text-gray-400">
        هنا يمكنك إدارة فئات المصروفات. إدارة بنود المصروفات نفسها تتم عند إنشاء سند صرف.
      </p>

      <ExpenseCategoryForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        categoryToEdit={selectedCategory}
      />

      {loading && <p>جاري التحميل...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">اسم الفئة</th>
                    <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                    </th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {categories.map((category) => (
                    <tr key={category.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{category.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                            <Button variant="ghost" size="sm" onClick={() => handleEditCategory(category)}>تعديل</Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(category.id)}>حذف</Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
        {categories.length === 0 && !loading && (
            <div className="text-center py-12">
                <p>لم يتم العثور على فئات. ابدأ بإضافة فئة مصروفات جديدة.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ExpensesPage;
