import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateExpenseCategorySchema, type ExpenseCategory, type CreateExpenseCategoryDTO } from '@shared/shared-types';
import { useExpenseCategoryStore } from '@/store/useExpenseCategoryStore';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/Dialog';

interface ExpenseCategoryFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  categoryToEdit?: ExpenseCategory | null;
}

export const ExpenseCategoryForm: React.FC<ExpenseCategoryFormProps> = ({ isOpen, setIsOpen, categoryToEdit }) => {
  const { createCategory, updateCategory } = useExpenseCategoryStore();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateExpenseCategoryDTO>({
    resolver: zodResolver(CreateExpenseCategorySchema),
    defaultValues: {
      name: categoryToEdit?.name || '',
    },
  });

  React.useEffect(() => {
    if (categoryToEdit) {
      reset(categoryToEdit);
    } else {
      reset({ name: '' });
    }
  }, [categoryToEdit, reset]);

  const onSubmit = async (data: CreateExpenseCategoryDTO) => {
    try {
      if (categoryToEdit) {
        await updateCategory(categoryToEdit.id, data);
      } else {
        await createCategory(data);
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to save expense category', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{categoryToEdit ? 'تعديل فئة مصروف' : 'إضافة فئة مصروف جديدة'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">اسم الفئة</Label>
              <Input id="name" {...register('name')} className="col-span-3" />
              {errors.name && <p className="col-span-4 text-red-500 text-sm">{errors.name.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">إلغاء</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
