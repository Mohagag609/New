import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreatePartnerSchema, type Partner, type CreatePartnerDTO } from '@/shared-types';
import { usePartnerStore } from '@/store/usePartnerStore';

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

interface PartnerFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  partnerToEdit?: Partner | null;
}

export const PartnerForm: React.FC<PartnerFormProps> = ({ isOpen, setIsOpen, partnerToEdit }) => {
  const { createPartner, updatePartner } = usePartnerStore();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePartnerDTO>({
    resolver: zodResolver(CreatePartnerSchema),
    defaultValues: {
      name: partnerToEdit?.name || '',
      phone: partnerToEdit?.phone || '',
      address: partnerToEdit?.address || '',
      openingBalance: partnerToEdit?.openingBalance || 0,
      notes: partnerToEdit?.notes || '',
    },
  });

  React.useEffect(() => {
    if (partnerToEdit) {
      reset(partnerToEdit);
    } else {
      reset({ name: '', phone: '', address: '', openingBalance: 0, notes: '' });
    }
  }, [partnerToEdit, reset]);

  const onSubmit = async (data: CreatePartnerDTO) => {
    try {
      if (partnerToEdit) {
        await updatePartner(partnerToEdit.id, data);
      } else {
        await createPartner(data);
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to save partner', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{partnerToEdit ? 'تعديل شريك' : 'إضافة شريك جديد'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">الاسم</Label>
              <Input id="name" {...register('name')} className="col-span-3" />
              {errors.name && <p className="col-span-4 text-red-500 text-sm">{errors.name.message}</p>}
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
