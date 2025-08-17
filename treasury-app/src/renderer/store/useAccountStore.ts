import { create } from 'zustand';
import type { Account, CreateAccountDTO, UpdateAccountDTO } from '@shared/shared-types';

interface AccountState {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  fetchAccounts: () => Promise<void>;
  createAccount: (data: CreateAccountDTO) => Promise<Account | null>;
  updateAccount: (id: number, data: UpdateAccountDTO) => Promise<Account | null>;
  deleteAccount: (id: number) => Promise<boolean>;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  loading: false,
  error: null,

  fetchAccounts: async () => {
    set({ loading: true, error: null });
    try {
      const accounts = await window.electronAPI.accounts.list();
      set({ accounts, loading: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to fetch accounts:', error);
    }
  },

  createAccount: async (data) => {
    set({ loading: true, error: null });
    try {
      const newAccount = await window.electronAPI.accounts.create(data);
      // Refresh the list to include the new account
      await get().fetchAccounts();
      return newAccount;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to create account:', error);
      return null;
    }
  },

  updateAccount: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updatedAccount = await window.electronAPI.accounts.update(id, data);
      // Refresh the list to show the updated account
      await get().fetchAccounts();
      return updatedAccount;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to update account:', error);
      return null;
    }
  },

  deleteAccount: async (id) => {
    set({ loading: true, error: null });
    try {
      const { success } = await window.electronAPI.accounts.delete(id);
      if (success) {
        // Refresh the list to remove the deleted account
        await get().fetchAccounts();
      }
      return success;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to delete account:', error);
      return false;
    }
  },
}));
