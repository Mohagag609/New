import { create } from 'zustand';
import type { Partner, CreatePartnerDTO, UpdatePartnerDTO } from '../../shared-types';

interface PartnerState {
  partners: Partner[];
  loading: boolean;
  error: string | null;
  fetchPartners: () => Promise<void>;
  createPartner: (data: CreatePartnerDTO) => Promise<Partner | null>;
  updatePartner: (id: number, data: UpdatePartnerDTO) => Promise<Partner | null>;
  deletePartner: (id: number) => Promise<boolean>;
}

export const usePartnerStore = create<PartnerState>((set, get) => ({
  partners: [],
  loading: false,
  error: null,

  fetchPartners: async () => {
    set({ loading: true, error: null });
    try {
      const partners = await window.electronAPI.partners.list();
      set({ partners, loading: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to fetch partners:', error);
    }
  },

  createPartner: async (data) => {
    set({ loading: true, error: null });
    try {
      const newPartner = await window.electronAPI.partners.create(data);
      await get().fetchPartners();
      return newPartner;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to create partner:', error);
      return null;
    }
  },

  updatePartner: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updatedPartner = await window.electronAPI.partners.update(id, data);
      await get().fetchPartners();
      return updatedPartner;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to update partner:', error);
      return null;
    }
  },

  deletePartner: async (id) => {
    set({ loading: true, error: null });
    try {
      const { success } = await window.electronAPI.partners.delete(id);
      if (success) {
        await get().fetchPartners();
      }
      return success;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to delete partner:', error);
      return false;
    }
  },
}));
