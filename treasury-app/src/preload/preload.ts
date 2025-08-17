import { contextBridge, ipcRenderer } from 'electron';
import type {
  CreateAccountDTO, UpdateAccountDTO,
  CreatePartyDTO, UpdatePartyDTO,
  CreatePartnerDTO, UpdatePartnerDTO,
  CreateExpenseCategoryDTO, UpdateExpenseCategoryDTO,
  CreateVoucherDTO, UpdateVoucherDTO
} from '../shared-types';

// Define the API that will be exposed to the renderer process
const electronAPI = {
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    create: (data: CreateAccountDTO) => ipcRenderer.invoke('accounts:create', data),
    update: (id: number, data: UpdateAccountDTO) => ipcRenderer.invoke('accounts:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('accounts:delete', id),
  },
  parties: {
    list: () => ipcRenderer.invoke('parties:list'),
    create: (data: CreatePartyDTO) => ipcRenderer.invoke('parties:create', data),
    update: (id: number, data: UpdatePartyDTO) => ipcRenderer.invoke('parties:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('parties:delete', id),
  },
  partners: {
    list: () => ipcRenderer.invoke('partners:list'),
    create: (data: CreatePartnerDTO) => ipcRenderer.invoke('partners:create', data),
    update: (id: number, data: UpdatePartnerDTO) => ipcRenderer.invoke('partners:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('partners:delete', id),
  },
  expenses: {
    categories: {
      list: () => ipcRenderer.invoke('expenses:categories:list'),
      create: (data: CreateExpenseCategoryDTO) => ipcRenderer.invoke('expenses:categories:create', data),
      update: (id: number, data: UpdateExpenseCategoryDTO) => ipcRenderer.invoke('expenses:categories:update', id, data),
      delete: (id: number) => ipcRenderer.invoke('expenses:categories:delete', id),
    },
    // items: { ... } // Will be added later
  },
  vouchers: {
    list: () => ipcRenderer.invoke('vouchers:list'),
    create: (data: CreateVoucherDTO) => ipcRenderer.invoke('vouchers:create', data),
    update: (id: number, data: UpdateVoucherDTO) => ipcRenderer.invoke('vouchers:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('vouchers:delete', id),
  },
  dashboard: {
    getKpis: (range: { from: string, to: string }) => ipcRenderer.invoke('dashboard:kpis', range),
    getChartData: (range: { from: string, to: string }) => ipcRenderer.invoke('dashboard:chart', range),
  },
  reports: {
    getAccountBalances: () => ipcRenderer.invoke('reports:account-balances'),
    getIncomeStatement: (range: { from: string, to: string }) => ipcRenderer.invoke('reports:income-statement', range),
  },
  import: {
    selectFile: (title: string, filters: any) => ipcRenderer.invoke('import:select-file', title, filters),
    run: (mappingPath: string, dataPath: string) => ipcRenderer.invoke('import:run', mappingPath, dataPath),
  },
  // ... other APIs will be added here
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// It's good practice to also define the type of the exposed API
// We can do this in a declaration file (e.g., electron.d.ts)
// so that TypeScript in the renderer process knows about window.electronAPI
export type ElectronAPI = typeof electronAPI;
