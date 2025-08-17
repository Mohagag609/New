import db from '../db';
import { CreateAccountDTO, UpdateAccountDTO } from '../../shared-types';

export async function listAccounts() {
  const accounts = db.prepare('SELECT id, name, type, parent_id as parentId, active FROM accounts ORDER BY name ASC').all();
  return accounts;
}

export async function createAccount(data: CreateAccountDTO) {
  const { name, type, parentId } = data;
  const stmt = db.prepare(
    'INSERT INTO accounts (name, type, parent_id) VALUES (?, ?, ?)'
  );
  const result = stmt.run(name, type, parentId);
  return { id: result.lastInsertRowid, ...data };
}

export async function updateAccount(id: number, data: UpdateAccountDTO) {
    const { name, type, parentId, active } = data;
    const stmt = db.prepare(
        'UPDATE accounts SET name = ?, type = ?, parent_id = ?, active = ? WHERE id = ?'
    );
    stmt.run(name, type, parentId, active ? 1 : 0, id);
    return { id, ...data };
}

export async function deleteAccount(id: number) {
    // Check for child accounts first
    const children = db.prepare('SELECT id FROM accounts WHERE parent_id = ?').all(id);
    if (children.length > 0) {
        throw new Error('لا يمكن حذف حساب لديه حسابات فرعية.');
    }
    // Check for associated entries
    const entries = db.prepare('SELECT id FROM entries WHERE account_id = ?').all(id);
    if (entries.length > 0) {
        throw new Error('لا يمكن حذف حساب مرتبط بحركات مالية.');
    }

    const stmt = db.prepare('DELETE FROM accounts WHERE id = ?');
    const result = stmt.run(id);
    return { success: result.changes > 0 };
}
