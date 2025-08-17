import db from '../db';
import { CreateVoucherDTO, UpdateVoucherDTO } from '../../shared-types';

export async function listVouchers() {
  // This query joins vouchers with related tables to get names instead of just IDs.
  const query = `
    SELECT
      v.id,
      v.code,
      v.date,
      v.kind,
      v.amount,
      v.method,
      a.name as accountName,
      p.name as partyName,
      pt.name as partnerName
    FROM vouchers v
    LEFT JOIN accounts a ON v.account_id = a.id
    LEFT JOIN parties p ON v.party_id = p.id
    LEFT JOIN partners pt ON v.partner_id = pt.id
    ORDER BY v.date DESC, v.id DESC
  `;
  const vouchers = db.prepare(query).all();
  return vouchers;
}

export async function createVoucher(data: CreateVoucherDTO) {
  const { kind, amount, date, accountId, targetAccountId, notes } = data;

  // All voucher and entry creation must happen in a single transaction
  // to ensure data integrity.
  const transaction = db.transaction(() => {
    // 1. Insert the voucher
    const voucherStmt = db.prepare(
      `INSERT INTO vouchers (date, kind, account_id, party_id, partner_id, project_id, amount, method, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    // Dummy user ID for now
    const created_by = 1;
    const voucherResult = voucherStmt.run(
      date, kind, accountId, data.partyId, data.partnerId, data.projectId, amount, data.method, notes, created_by
    );
    const voucherId = voucherResult.lastInsertRowid;

    if (!voucherId) {
      throw new Error("Failed to create voucher.");
    }

    // 2. Insert the balanced journal entries
    const entryStmt = db.prepare(
      `INSERT INTO entries (voucher_id, account_id, debit, credit, date, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    );

    if (kind === 'receipt') {
      // Receipt: Debit the cash/bank account, Credit the target account
      entryStmt.run(voucherId, accountId, amount, 0, date, notes); // Debit
      entryStmt.run(voucherId, targetAccountId, 0, amount, date, notes); // Credit
    } else if (kind === 'payment') {
      // Payment: Credit the cash/bank account, Debit the target account
      entryStmt.run(voucherId, accountId, 0, amount, date, notes); // Credit
      entryStmt.run(voucherId, targetAccountId, amount, 0, date, notes); // Debit
    } else {
      throw new Error(`Invalid voucher kind: ${kind}`);
    }

    return { id: voucherId, ...data };
  });

  return transaction();
}

export async function deleteVoucher(id: number) {
    // The database is set up with ON DELETE CASCADE for the entries table,
    // so deleting a voucher will automatically delete its associated entries.
    const stmt = db.prepare('DELETE FROM vouchers WHERE id = ?');
    const result = stmt.run(id);
    return { success: result.changes > 0 };
}

// Note: Update voucher is complex because it might require reversing old entries
// and creating new ones. For now, we'll implement a simple update.
export async function updateVoucher(id: number, data: UpdateVoucherDTO) {
    // A full implementation would need to handle changes in entries as well.
    // This simple version just updates the voucher details.
    const { date, accountId, partyId, partnerId, projectId, amount, method, notes } = data;
    const stmt = db.prepare(
        `UPDATE vouchers SET
            date = ?, account_id = ?, party_id = ?, partner_id = ?, project_id = ?,
            amount = ?, method = ?, notes = ?
         WHERE id = ?`
    );
    stmt.run(date, accountId, partyId, partnerId, projectId, amount, method, notes, id);
    // In a real app, you'd need to adjust journal entries here, possibly in a transaction.
    return { id, ...data };
}
