import { create } from 'zustand';
import type { ExpenseCategory, CreateExpenseCategoryDTO, UpdateExpenseCategoryDTO } from '@shared/shared-types';

interface ExpenseCategoryState {
  categories: ExpenseCategory[];
  loading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  createCategory: (data: CreateExpenseCategoryDTO) => Promise<ExpenseCategory | null>;
  updateCategory: (id: number, data: UpdateExpenseCategoryDTO) => Promise<ExpenseCategory | null>;
  deleteCategory: (id: number) => Promise<boolean>;
}

export const useExpenseCategoryStore = create<ExpenseCategoryState>((set, get) => ({
  categories: [],
  loading: false,
  error: null,

  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const categories = await window.electronAPI.expenses.categories.list();
      set({ categories, loading: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to fetch expense categories:', error);
    }
  },

  createCategory: async (data) => {
    set({ loading: true, error: null });
    try {
      const newCategory = await window.electronAPI.expenses.categories.create(data);
      await get().fetchCategories();
      return newCategory;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to create expense category:', error);
      return null;
    }
  },

  updateCategory: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const updatedCategory = await window.electronAPI.expenses.categories.update(id, data);
      await get().fetchCategories();
      return updatedCategory;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to update expense category:', error);
      return null;
    }
  },

  deleteCategory: async (id) => {
    set({ loading: true, error: null });
    try {
      const { success } = await window.electronAPI.expenses.categories.delete(id);
      if (success) {
        await get().fetchCategories();
      }
      return success;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ error, loading: false });
      console.error('Failed to delete expense category:', error);
      return false;
    }
  },
}));
