import path from 'node:path';
import { getDb } from '../src/main/db';
import bcrypt from 'bcryptjs';

const devDbPath = path.join(process.cwd(), 'treasury.db');
const db = getDb(devDbPath);

function seed() {
  console.log('Seeding database...');

  db.transaction(() => {
    // Clear existing data in reverse order of creation
    db.exec('DELETE FROM entries');
    db.exec('DELETE FROM vouchers');
    db.exec('DELETE FROM attachments');
    db.exec('DELETE FROM rules');
    db.exec('DELETE FROM expense_items');
    db.exec('DELETE FROM expense_categories');
    db.exec('DELETE FROM partners');
    db.exec('DELETE FROM parties');
    db.exec('DELETE FROM accounts');
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM projects');

    // Reset autoincrement counters
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('entries', 'vouchers', 'attachments', 'rules', 'expense_items', 'expense_categories', 'partners', 'parties', 'accounts', 'users', 'projects');");

    // Insert Users
    const adminPass = bcrypt.hashSync('admin123', 10);
    const viewerPass = bcrypt.hashSync('viewer123', 10);
    db.prepare('INSERT INTO users (name, role, hash) VALUES (?, ?, ?)').run('admin', 'admin', adminPass);
    db.prepare('INSERT INTO users (name, role, hash) VALUES (?, ?, ?)').run('viewer', 'viewer', viewerPass);

    // Insert Accounts
    const asset = db.prepare('INSERT INTO accounts (name, type) VALUES (?, ?)').run('الأصول', 'asset').lastInsertRowid;
    const cash = db.prepare('INSERT INTO accounts (name, type, parent_id) VALUES (?, ?, ?)').run('الصندوق', 'cash', asset).lastInsertRowid;
    const bank = db.prepare('INSERT INTO accounts (name, type, parent_id) VALUES (?, ?, ?)').run('البنك', 'bank', asset).lastInsertRowid;

    const expense = db.prepare('INSERT INTO accounts (name, type) VALUES (?, ?)').run('المصروفات', 'expense').lastInsertRowid;
    const genEx = db.prepare('INSERT INTO accounts (name, type, parent_id) VALUES (?, ?, ?)').run('مصروفات عمومية', 'expense', expense).lastInsertRowid;

    const revenue = db.prepare('INSERT INTO accounts (name, type) VALUES (?, ?)').run('الإيرادات', 'revenue').lastInsertRowid;
    const sales = db.prepare('INSERT INTO accounts (name, type, parent_id) VALUES (?, ?, ?)').run('مبيعات', 'revenue', revenue).lastInsertRowid;

    // Insert Parties
    const customer = db.prepare('INSERT INTO parties (name, kind) VALUES (?, ?)').run('عميل نقدي', 'customer').lastInsertRowid;
    const vendor = db.prepare('INSERT INTO parties (name, kind) VALUES (?, ?)').run('مورد نقدي', 'vendor').lastInsertRowid;

    // Insert a sample voucher
    const voucherStmt = db.prepare(`INSERT INTO vouchers (date, kind, account_id, party_id, amount, method, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`);
    const entryStmt = db.prepare(`INSERT INTO entries (voucher_id, account_id, debit, credit, date, notes) VALUES (?, ?, ?, ?, ?, ?)`);

    const today = new Date().toISOString().split('T')[0];
    const voucherId = voucherStmt.run(today, 'receipt', cash, customer, 5000, 'cash', 'دفعة من العميل النقدي').lastInsertRowid;
    entryStmt.run(voucherId, cash, 5000, 0, today, 'دفعة من العميل النقدي');
    entryStmt.run(voucherId, sales, 0, 5000, today, 'دفعة من العميل النقدي');

    console.log('Database seeded successfully!');
  })();
}

try {
    seed();
    db.close();
} catch (error) {
    console.error('Failed to seed database:', error);
    process.exit(1);
}
