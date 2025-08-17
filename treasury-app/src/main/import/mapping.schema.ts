import { z } from 'zod';

// A mapping can be a simple string (column name) or an object with normalization rules.
const ValueMappingSchema = z.union([
  z.string(),
  z.object({
    column: z.string(),
    normalize: z.record(z.string()),
  }),
]);

const MappingConfigSchema = z.object({
  version: z.literal(1),
  sheet: z.string().optional(),
  dateFormat: z.string().optional(),
  decimalSeparator: z.enum([',', '.']).optional(),
  mappings: z.object({
    date: z.string(),
    code: z.string().optional(),
    kind: ValueMappingSchema,
    account: z.string(), // This is the target account, not the cash/bank account
    party: z.string().optional(),
    partner: z.string().optional(),
    amount: z.string(),
    method: ValueMappingSchema.optional(),
    notes: z.string().optional(),
  }),
  options: z.object({
    createMissingAccounts: z.boolean().optional().default(false),
    createMissingParties: z.boolean().optional().default(false),
    createMissingPartners: z.boolean().optional().default(false),
    // The cash/bank account to use for all imported vouchers.
    // This is simpler than specifying it per row for a bulk import.
    defaultCashAccountName: z.string(),
  }),
  duplicateCheckKeys: z.array(z.enum(['code', 'date', 'amount', 'party'])).optional(),
});

export type MappingConfig = z.infer<typeof MappingConfigSchema>;

export default MappingConfigSchema;
