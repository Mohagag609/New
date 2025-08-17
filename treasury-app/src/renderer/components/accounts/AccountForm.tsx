import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateAccountSchema, type Account, type CreateAccountDTO } from '@shared/shared-types';
import { useAccountStore } from '@/store/useAccountStore';

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

interface AccountFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  accountToEdit?: Account | null;
}

export const AccountForm: React.FC<AccountFormProps> = ({ isOpen, setIsOpen, accountToEdit }) => {
  const { createAccount, updateAccount, accounts } = useAccountStore();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateAccountDTO>({
    resolver: zodResolver(CreateAccountSchema),
    defaultValues: {
      name: accountToEdit?.name || '',
      type: accountToEdit?.type || '',
      parentId: accountToEdit?.parentId || null,
    },
  });

  React.useEffect(() => {
    if (accountToEdit) {
      reset({
        name: accountToEdit.name,
        type: accountToEdit.type,
        parentId: accountToEdit.parentId,
      });
    } else {
      reset({ name: '', type: '', parentId: null });
    }
  }, [accountToEdit, reset]);

  const onSubmit = async (data: CreateAccountDTO) => {
    try {
      if (accountToEdit) {
        await updateAccount(accountToEdit.id, { ...accountToEdit, ...data });
      } else {
        await createAccount(data);
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to save account', error);
      // You might want to show an error toast here
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{accountToEdit ? 'تعديل حساب' : 'إضافة حساب جديد'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">الاسم</Label>
              <Input id="name" {...register('name')} className="col-span-3" />
              {errors.name && <p className="col-span-4 text-red-500 text-sm">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">النوع</Label>
              <Input id="type" {...register('type')} className="col-span-3" />
              {errors.type && <p className="col-span-4 text-red-500 text-sm">{errors.type.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="parentId" className="text-right">الحساب الرئيسي</Label>
              <select
                id="parentId"
                {...register('parentId', { valueAsNumber: true })}
                className="col-span-3 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700"
              >
                <option value="">-- لا يوجد --</option>
                {accounts
                  .filter(acc => acc.id !== accountToEdit?.id) // Prevent self-parenting
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
              </select>
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
