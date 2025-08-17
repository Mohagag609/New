import { create } from 'zustand';
import type { Party, CreatePartyDTO, UpdatePartyDTO } from '../../shared-types';

interface PartyState {
  parties: Party[];
  loading: boolean;
  error: string | null;
  fetchParties: () => Promise<void>;
  createParty: (data: CreatePartyDTO) => Promise<Party | null>;
  updateParty: (id: number, data: UpdatePartyDTO) => Promise<Party | null>;
  deleteParty: (id: number) => Promise<boolean>;
}

export const usePartyStore = create<PartyState>((set, get) => ({
  parties: [],
  loading: false,
  error: null,

  fetchParties: async () => {
    set({ loading: true, error: null });
    try {
      const parties = await window.electronAPI.parties.list();
      set({ parties, loading: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to fetch parties:', error);
    }
  },

  createParty: async (data) => {
    set({ loading: true, error: null });
    try {
      const newParty = await window.electronAPI.parties.create(data);
      await get().fetchParties();
      return newParty;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to create party:', error);
      return null;
    }
  },

  updateParty: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updatedParty = await window.electronAPI.parties.update(id, data);
      await get().fetchParties();
      return updatedParty;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to update party:', error);
      return null;
    }
  },

  deleteParty: async (id) => {
    set({ loading: true, error: null });
    try {
      const { success } = await window.electronAPI.parties.delete(id);
      if (success) {
        await get().fetchParties();
      }
      return success;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to delete party:', error);
      return false;
    }
  },
}));
