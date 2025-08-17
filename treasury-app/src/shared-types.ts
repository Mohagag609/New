import { z } from 'zod';

export const AccountSchema = z.object({
  id: z.number().int(),
  name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
  type: z.string().min(2, { message: "النوع مطلوب" }),
  parentId: z.number().int().nullable(),
  active: z.boolean(),
  // created_at and updated_at will be handled by the database
});

export const CreateAccountSchema = AccountSchema.omit({ id: true, active: true }).extend({
  // In HTML forms, null/empty values from a select come as strings.
  // Zod's `coerce` helps convert it gracefully.
  parentId: z.preprocess((val) => (val === '' || val === null ? null : Number(val)), z.number().int().nullable()),
});
export const UpdateAccountSchema = AccountSchema.omit({ id: true }).extend({
    parentId: z.preprocess((val) => (val === '' || val === null ? null : Number(val)), z.number().int().nullable()),
});

export type Account = z.infer<typeof AccountSchema>;
export type CreateAccountDTO = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountDTO = z.infer<typeof UpdateAccountSchema>;

// --- Parties ---
export const PartySchema = z.object({
  id: z.number().int(),
  name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
  kind: z.enum(['customer', 'vendor'], { errorMap: () => ({ message: 'يجب تحديد النوع (عميل/مورد)' }) }),
  phone: z.string().optional(),
  address: z.string().optional(),
  openingBalance: z.number().default(0),
  notes: z.string().optional(),
});

export const CreatePartySchema = PartySchema.omit({ id: true });
export const UpdatePartySchema = PartySchema.omit({ id: true });

export type Party = z.infer<typeof PartySchema>;
export type CreatePartyDTO = z.infer<typeof CreatePartySchema>;
export type UpdatePartyDTO = z.infer<typeof UpdatePartySchema>;

// --- Partners ---
export const PartnerSchema = z.object({
  id: z.number().int(),
  name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
  phone: z.string().optional(),
  address: z.string().optional(),
  openingBalance: z.number().default(0),
  notes: z.string().optional(),
});

export const CreatePartnerSchema = PartnerSchema.omit({ id: true });
export const UpdatePartnerSchema = PartnerSchema.omit({ id: true });

export type Partner = z.infer<typeof PartnerSchema>;
export type CreatePartnerDTO = z.infer<typeof CreatePartnerSchema>;
export type UpdatePartnerDTO = z.infer<typeof UpdatePartnerSchema>;

// --- Vouchers & Entries ---
export const EntrySchema = z.object({
  id: z.number().int(),
  voucherId: z.number().int().nullable(),
  accountId: z.number().int(),
  debit: z.number().default(0),
  credit: z.number().default(0),
  date: z.string(),
  notes: z.string().optional(),
});

export const VoucherSchema = z.object({
  id: z.number().int(),
  code: z.string().optional(),
  date: z.string().min(1, "التاريخ مطلوب"),
  kind: z.enum(['receipt', 'payment'], { errorMap: () => ({ message: 'يجب تحديد نوع السند' }) }),
  accountId: z.number({required_error: "حساب الخزينة/البنك مطلوب"}), // The main cash/bank account
  partyId: z.number().int().nullable(),
  partnerId: z.number().int().nullable(),
  projectId: z.number().int().nullable(),
  amount: z.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  method: z.enum(['cash', 'transfer', 'cheque'], { errorMap: () => ({ message: 'يجب تحديد طريقة الدفع' }) }),
  notes: z.string().optional(),
  // created_by will be handled by the backend
  entries: z.array(EntrySchema).optional(), // Entries can be included when fetching details
});

export const CreateVoucherSchema = VoucherSchema.omit({ id: true, entries: true }).extend({
  // This is the account that will be credited in a receipt, or debited in a payment
  targetAccountId: z.number({required_error: "الحساب المقابل مطلوب"}),
});

export const UpdateVoucherSchema = VoucherSchema.omit({ id: true, entries: true });

export type Entry = z.infer<typeof EntrySchema>;
export type Voucher = z.infer<typeof VoucherSchema>;
export type CreateVoucherDTO = z.infer<typeof CreateVoucherSchema>;
export type UpdateVoucherDTO = z.infer<typeof UpdateVoucherSchema>;


// --- Expense Categories ---
export const ExpenseCategorySchema = z.object({
  id: z.number().int(),
  name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
});

export const CreateExpenseCategorySchema = ExpenseCategorySchema.omit({ id: true });
export const UpdateExpenseCategorySchema = ExpenseCategorySchema.omit({ id: true });

export type ExpenseCategory = z.infer<typeof ExpenseCategorySchema>;
export type CreateExpenseCategoryDTO = z.infer<typeof CreateExpenseCategorySchema>;
export type UpdateExpenseCategoryDTO = z.infer<typeof UpdateExpenseCategorySchema>;
