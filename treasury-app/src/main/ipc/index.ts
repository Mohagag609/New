import { ipcMain } from 'electron';
import { listAccounts, createAccount, updateAccount, deleteAccount } from './accounts';
import { listParties, createParty, updateParty, deleteParty } from './parties';
import { listPartners, createPartner, updatePartner, deletePartner } from './partners';
import { listExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory } from './expenses';
import { listVouchers, createVoucher, updateVoucher, deleteVoucher } from './vouchers';
import { getKpis, getMonthlyChartData } from './dashboard';
import { getAccountBalances, getIncomeStatement } from './reports';
import { handleSelectFile, handleRunImport } from './import';
import {
  CreateAccountSchema, UpdateAccountSchema,
  CreatePartySchema, UpdatePartySchema,
  CreatePartnerSchema, UpdatePartnerSchema,
  CreateExpenseCategorySchema, UpdateExpenseCategorySchema,
  CreateVoucherSchema, UpdateVoucherSchema
} from '../../shared-types';

export function registerIpcHandlers() {
  console.log('Registering IPC handlers...');

  // Account Handlers
  ipcMain.handle('accounts:list', () => listAccounts());

  ipcMain.handle('accounts:create', (_event, data) => {
    const validation = CreateAccountSchema.safeParse(data);
    if (!validation.success) {
      throw new Error(`Invalid account data: ${validation.error.message}`);
    }
    return createAccount(validation.data);
  });

  ipcMain.handle('accounts:update', (_event, id, data) => {
    const validation = UpdateAccountSchema.safeParse(data);
    if (!validation.success) {
        throw new Error(`Invalid account data: ${validation.error.message}`);
    }
    return updateAccount(id, validation.data);
  });

  ipcMain.handle('accounts:delete', (_event, id) => deleteAccount(id));

  // Party Handlers
  ipcMain.handle('parties:list', () => listParties());

  ipcMain.handle('parties:create', (_event, data) => {
    const validation = CreatePartySchema.safeParse(data);
    if (!validation.success) {
      throw new Error(`Invalid party data: ${validation.error.message}`);
    }
    return createParty(validation.data);
  });

  ipcMain.handle('parties:update', (_event, id, data) => {
    const validation = UpdatePartySchema.safeParse(data);
    if (!validation.success) {
      throw new Error(`Invalid party data: ${validation.error.message}`);
    }
    return updateParty(id, validation.data);
  });

  ipcMain.handle('parties:delete', (_event, id) => deleteParty(id));

  // Partner Handlers
  ipcMain.handle('partners:list', () => listPartners());

  ipcMain.handle('partners:create', (_event, data) => {
    const validation = CreatePartnerSchema.safeParse(data);
    if (!validation.success) throw new Error(`Invalid partner data: ${validation.error.message}`);
    return createPartner(validation.data);
  });

  ipcMain.handle('partners:update', (_event, id, data) => {
    const validation = UpdatePartnerSchema.safeParse(data);
    if (!validation.success) throw new Error(`Invalid partner data: ${validation.error.message}`);
    return updatePartner(id, validation.data);
  });

  ipcMain.handle('partners:delete', (_event, id) => deletePartner(id));

  // Expense Category Handlers
  ipcMain.handle('expenses:categories:list', () => listExpenseCategories());

  ipcMain.handle('expenses:categories:create', (_event, data) => {
    const validation = CreateExpenseCategorySchema.safeParse(data);
    if (!validation.success) throw new Error(`Invalid expense category data: ${validation.error.message}`);
    return createExpenseCategory(validation.data);
  });

  ipcMain.handle('expenses:categories:update', (_event, id, data) => {
    const validation = UpdateExpenseCategorySchema.safeParse(data);
    if (!validation.success) throw new Error(`Invalid expense category data: ${validation.error.message}`);
    return updateExpenseCategory(id, validation.data);
  });

  ipcMain.handle('expenses:categories:delete', (_event, id) => deleteExpenseCategory(id));

  // Voucher Handlers
  ipcMain.handle('vouchers:list', () => listVouchers());

  ipcMain.handle('vouchers:create', (_event, data) => {
    const validation = CreateVoucherSchema.safeParse(data);
    if (!validation.success) throw new Error(`Invalid voucher data: ${validation.error.message}`);
    return createVoucher(validation.data);
  });

  ipcMain.handle('vouchers:update', (_event, id, data) => {
    const validation = UpdateVoucherSchema.safeParse(data);
    if (!validation.success) throw new Error(`Invalid voucher data: ${validation.error.message}`);
    return updateVoucher(id, validation.data);
  });

  ipcMain.handle('vouchers:delete', (_event, id) => deleteVoucher(id));

  // Dashboard Handlers
  ipcMain.handle('dashboard:kpis', (_event, range) => getKpis(range));
  ipcMain.handle('dashboard:chart', (_event, range) => getMonthlyChartData(range));

  // Reports Handlers
  ipcMain.handle('reports:account-balances', () => getAccountBalances());
  ipcMain.handle('reports:income-statement', (_event, range) => getIncomeStatement(range));

  // Import Handlers
  ipcMain.handle('import:select-file', (_event, title, filters) => handleSelectFile(title, filters));
  ipcMain.handle('import:run', (_event, mappingPath, dataPath) => handleRunImport(mappingPath, dataPath));

  console.log('IPC handlers registered.');
}
