import { create } from 'zustand';
import type { Voucher, CreateVoucherDTO, UpdateVoucherDTO } from '../../shared-types';

// The list view returns a different shape, let's type it
export interface VoucherListView extends Omit<Voucher, 'accountId' | 'partyId' | 'partnerId'> {
    accountName: string;
    partyName: string | null;
    partnerName: string | null;
}


interface VoucherState {
  vouchers: VoucherListView[];
  loading: boolean;
  error: string | null;
  fetchVouchers: () => Promise<void>;
  createVoucher: (data: CreateVoucherDTO) => Promise<Voucher | null>;
  updateVoucher: (id: number, data: UpdateVoucherDTO) => Promise<Voucher | null>;
  deleteVoucher: (id: number) => Promise<boolean>;
}

export const useVoucherStore = create<VoucherState>((set, get) => ({
  vouchers: [],
  loading: false,
  error: null,

  fetchVouchers: async () => {
    set({ loading: true, error: null });
    try {
      const vouchers = await window.electronAPI.vouchers.list();
      set({ vouchers, loading: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to fetch vouchers:', error);
    }
  },

  createVoucher: async (data) => {
    set({ loading: true, error: null });
    try {
      const newVoucher = await window.electronAPI.vouchers.create(data);
      await get().fetchVouchers();
      return newVoucher;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to create voucher:', error);
      return null;
    }
  },

  updateVoucher: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updatedVoucher = await window.electronAPI.vouchers.update(id, data);
      await get().fetchVouchers();
      return updatedVoucher;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to update voucher:', error);
      return null;
    }
  },

  deleteVoucher: async (id) => {
    set({ loading: true, error: null });
    try {
      const { success } = await window.electronAPI.vouchers.delete(id);
      if (success) {
        await get().fetchVouchers();
      }
      return success;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to delete voucher:', error);
      return false;
    }
  },
}));
