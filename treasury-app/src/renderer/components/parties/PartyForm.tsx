import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreatePartySchema, type Party, type CreatePartyDTO } from '@/shared-types';
import { usePartyStore } from '@/store/usePartyStore';

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

interface PartyFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  partyToEdit?: Party | null;
}

export const PartyForm: React.FC<PartyFormProps> = ({ isOpen, setIsOpen, partyToEdit }) => {
  const { createParty, updateParty } = usePartyStore();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePartyDTO>({
    resolver: zodResolver(CreatePartySchema),
    defaultValues: {
      name: partyToEdit?.name || '',
      kind: partyToEdit?.kind || 'customer',
      phone: partyToEdit?.phone || '',
      address: partyToEdit?.address || '',
      openingBalance: partyToEdit?.openingBalance || 0,
      notes: partyToEdit?.notes || '',
    },
  });

  React.useEffect(() => {
    if (partyToEdit) {
      reset(partyToEdit);
    } else {
      reset({ name: '', kind: 'customer', phone: '', address: '', openingBalance: 0, notes: '' });
    }
  }, [partyToEdit, reset]);

  const onSubmit = async (data: CreatePartyDTO) => {
    try {
      if (partyToEdit) {
        await updateParty(partyToEdit.id, data);
      } else {
        await createParty(data);
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to save party', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{partyToEdit ? 'تعديل طرف' : 'إضافة طرف جديد'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">الاسم</Label>
              <Input id="name" {...register('name')} className="col-span-3" />
              {errors.name && <p className="col-span-4 text-red-500 text-sm">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="kind" className="text-right">النوع</Label>
              <select id="kind" {...register('kind')} className="col-span-3 h-10 w-full rounded-md border dark:border-gray-600 dark:bg-gray-700">
                <option value="customer">عميل</option>
                <option value="vendor">مورد</option>
              </select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">الهاتف</Label>
              <Input id="phone" {...register('phone')} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">العنوان</Label>
              <Input id="address" {...register('address')} className="col-span-3" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="openingBalance" className="text-right">رصيد افتتاحي</Label>
              <Input id="openingBalance" type="number" {...register('openingBalance', { valueAsNumber: true })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">ملاحظات</Label>
              <Input id="notes" {...register('notes')} className="col-span-3" />
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
