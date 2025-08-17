import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateVoucherSchema, type CreateVoucherDTO } from '@/shared-types';

import { useVoucherStore } from '@/store/useVoucherStore';
import { useAccountStore } from '@/store/useAccountStore';
import { usePartyStore } from '@/store/usePartyStore';
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

interface VoucherFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const VoucherForm: React.FC<VoucherFormProps> = ({ isOpen, setIsOpen }) => {
  const { createVoucher } = useVoucherStore();
  const { accounts } = useAccountStore();
  const { parties } = usePartyStore();
  const { partners } = usePartnerStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateVoucherDTO>({
    resolver: zodResolver(CreateVoucherSchema),
    defaultValues: {
      kind: 'receipt',
      method: 'cash',
      date: new Date().toISOString().split('T')[0], // Today's date
    },
  });

  const onSubmit = async (data: CreateVoucherDTO) => {
    try {
      await createVoucher(data);
      setIsOpen(false);
      reset();
    } catch (error) {
      console.error('Failed to save voucher', error);
    }
  };

  const cashAndBankAccounts = accounts.filter(a => ['asset', 'bank', 'cash'].includes(a.type.toLowerCase()));
  const targetAccounts = accounts.filter(a => !['asset', 'bank', 'cash'].includes(a.type.toLowerCase()));


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>إضافة سند جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Column 1 */}
            <div>
              <Label htmlFor="kind">نوع السند</Label>
              <select id="kind" {...register('kind')} className="h-10 w-full rounded-md border dark:border-gray-600 dark:bg-gray-700">
                <option value="receipt">سند قبض</option>
                <option value="payment">سند صرف</option>
              </select>
            </div>
            <div>
              <Label htmlFor="date">التاريخ</Label>
              <Input id="date" type="date" {...register('date')} />
              {errors.date && <p className="text-red-500 text-sm">{errors.date.message}</p>}
            </div>
            <div>
              <Label htmlFor="amount">المبلغ</Label>
              <Input id="amount" type="number" step="0.01" {...register('amount', { valueAsNumber: true })} />
              {errors.amount && <p className="text-red-500 text-sm">{errors.amount.message}</p>}
            </div>
            <div>
              <Label htmlFor="method">طريقة الدفع</Label>
              <select id="method" {...register('method')} className="h-10 w-full rounded-md border dark:border-gray-600 dark:bg-gray-700">
                <option value="cash">نقدي</option>
                <option value="transfer">تحويل</option>
                <option value="cheque">شيك</option>
              </select>
            </div>
            <div>
              <Label htmlFor="accountId">من/إلى حساب الخزينة/البنك</Label>
              <select id="accountId" {...register('accountId', { valueAsNumber: true })} className="h-10 w-full rounded-md border dark:border-gray-600 dark:bg-gray-700">
                {cashAndBankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {errors.accountId && <p className="text-red-500 text-sm">{errors.accountId.message}</p>}
            </div>
            <div>
              <Label htmlFor="targetAccountId">الحساب المقابل</Label>
              <select id="targetAccountId" {...register('targetAccountId', { valueAsNumber: true })} className="h-10 w-full rounded-md border dark:border-gray-600 dark:bg-gray-700">
                 {targetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {errors.targetAccountId && <p className="text-red-500 text-sm">{errors.targetAccountId.message}</p>}
            </div>
            <div>
              <Label htmlFor="partyId">الطرف (عميل/مورد)</Label>
              <select id="partyId" {...register('partyId', { valueAsNumber: true })} className="h-10 w-full rounded-md border dark:border-gray-600 dark:bg-gray-700">
                <option value="">-- اختياري --</option>
                {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="partnerId">الشريك</Label>
              <select id="partnerId" {...register('partnerId', { valueAsNumber: true })} className="h-10 w-full rounded-md border dark:border-gray-600 dark:bg-gray-700">
                <option value="">-- اختياري --</option>
                {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="notes">البيان / ملاحظات</Label>
              <Input id="notes" {...register('notes')} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">إلغاء</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ السند'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
