import db from '../db';
import { CreatePartnerDTO, UpdatePartnerDTO } from '../../shared-types';

export async function listPartners() {
  const partners = db.prepare('SELECT id, name, phone, address, opening_balance as openingBalance, notes FROM partners ORDER BY name ASC').all();
  return partners;
}

export async function createPartner(data: CreatePartnerDTO) {
  const { name, phone, address, openingBalance, notes } = data;
  const stmt = db.prepare(
    'INSERT INTO partners (name, phone, address, opening_balance, notes) VALUES (?, ?, ?, ?, ?)'
  );
  const result = stmt.run(name, phone, address, openingBalance, notes);
  return { id: result.lastInsertRowid, ...data };
}

export async function updatePartner(id: number, data: UpdatePartnerDTO) {
    const { name, phone, address, openingBalance, notes } = data;
    const stmt = db.prepare(
        'UPDATE partners SET name = ?, phone = ?, address = ?, opening_balance = ?, notes = ? WHERE id = ?'
    );
    stmt.run(name, phone, address, openingBalance, notes, id);
    return { id, ...data };
}

export async function deletePartner(id: number) {
    // Check for associated vouchers
    const vouchers = db.prepare('SELECT id FROM vouchers WHERE partner_id = ?').all(id);
    if (vouchers.length > 0) {
        throw new Error('لا يمكن حذف شريك مرتبط بسندات.');
    }
    // Check for associated rules
    const rules = db.prepare('SELECT id FROM rules WHERE partner_id = ?').all(id);
    if (rules.length > 0) {
        throw new Error('لا يمكن حذف شريك مرتبط بقواعد تسوية.');
    }

    const stmt = db.prepare('DELETE FROM partners WHERE id = ?');
    const result = stmt.run(id);
    return { success: result.changes > 0 };
}
