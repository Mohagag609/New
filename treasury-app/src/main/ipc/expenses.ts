import db from '../db';
import { CreateExpenseCategoryDTO, UpdateExpenseCategoryDTO } from '../../shared-types';

// --- Expense Categories ---

export async function listExpenseCategories() {
  const categories = db.prepare('SELECT id, name FROM expense_categories ORDER BY name ASC').all();
  return categories;
}

export async function createExpenseCategory(data: CreateExpenseCategoryDTO) {
  const { name } = data;
  const stmt = db.prepare('INSERT INTO expense_categories (name) VALUES (?)');
  const result = stmt.run(name);
  return { id: result.lastInsertRowid, ...data };
}

export async function updateExpenseCategory(id: number, data: UpdateExpenseCategoryDTO) {
    const { name } = data;
    const stmt = db.prepare('UPDATE expense_categories SET name = ? WHERE id = ?');
    stmt.run(name, id);
    return { id, ...data };
}

export async function deleteExpenseCategory(id: number) {
    // Check for associated expense items
    const items = db.prepare('SELECT id FROM expense_items WHERE category_id = ?').all(id);
    if (items.length > 0) {
        throw new Error('لا يمكن حذف فئة مصروفات تحتوي على بنود.');
    }

    const stmt = db.prepare('DELETE FROM expense_categories WHERE id = ?');
    const result = stmt.run(id);
    return { success: result.changes > 0 };
}

// TODO: IPC handlers for Expense Items will go here later.
