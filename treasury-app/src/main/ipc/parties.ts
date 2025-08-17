import db from '../db';
import { CreatePartyDTO, UpdatePartyDTO } from '../../shared-types';

export async function listParties() {
  const parties = db.prepare('SELECT id, name, kind, phone, address, opening_balance as openingBalance, notes FROM parties ORDER BY name ASC').all();
  return parties;
}

export async function createParty(data: CreatePartyDTO) {
  const { name, kind, phone, address, openingBalance, notes } = data;
  const stmt = db.prepare(
    'INSERT INTO parties (name, kind, phone, address, opening_balance, notes) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const result = stmt.run(name, kind, phone, address, openingBalance, notes);
  return { id: result.lastInsertRowid, ...data };
}

export async function updateParty(id: number, data: UpdatePartyDTO) {
    const { name, kind, phone, address, openingBalance, notes } = data;
    const stmt = db.prepare(
        'UPDATE parties SET name = ?, kind = ?, phone = ?, address = ?, opening_balance = ?, notes = ? WHERE id = ?'
    );
    stmt.run(name, kind, phone, address, openingBalance, notes, id);
    return { id, ...data };
}

export async function deleteParty(id: number) {
    // Check for associated vouchers
    const vouchers = db.prepare('SELECT id FROM vouchers WHERE party_id = ?').all(id);
    if (vouchers.length > 0) {
        throw new Error('لا يمكن حذف طرف مرتبط بسندات.');
    }

    const stmt = db.prepare('DELETE FROM parties WHERE id = ?');
    const result = stmt.run(id);
    return { success: result.changes > 0 };
}
