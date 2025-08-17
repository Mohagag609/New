import fs from 'fs';
import yaml from 'js-yaml';
import * as xlsx from 'xlsx';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import db from '../db';
import MappingConfigSchema from './mapping.schema';

dayjs.extend(customParseFormat);

export interface ImportReport {
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errors: { row: number; message: string; data: any }[];
}

// Helper to get a value from a row based on mapping
function getColumnValue(row: any, mapping: string | { column: string; normalize?: Record<string, string> }): any {
    const columnName = typeof mapping === 'string' ? mapping : mapping.column;
    return row[columnName];
}

// Helper to normalize a value
function normalizeValue(value: any, mapping: string | { column: string; normalize?: Record<string, string> }): any {
    if (typeof mapping === 'object' && mapping.normalize && value) {
        return mapping.normalize[value] || value;
    }
    return value;
}

// Find or create a related entity
function findOrCreate(entity: 'account' | 'party' | 'partner', name: string, defaults: any = {}): number {
    const tableName = entity === 'account' ? 'accounts' : entity === 'party' ? 'parties' : 'partners';
    let record = db.prepare(`SELECT id FROM ${tableName} WHERE name = ?`).get(name);
    if (record) {
        return (record as any).id;
    }

    // Create it
    const columns = ['name', ...Object.keys(defaults)];
    const values = [name, ...Object.values(defaults)];
    const placeholders = columns.map(() => '?').join(',');

    const stmt = db.prepare(`INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`);
    const result = stmt.run(...values);
    return result.lastInsertRowid as number;
}


export async function runImporter(mappingPath: string, dataPath: string): Promise<ImportReport> {
    const report: ImportReport = { totalRows: 0, importedCount: 0, skippedCount: 0, errors: [] };

    const mappingConfig = MappingConfigSchema.parse(yaml.load(fs.readFileSync(mappingPath, 'utf-8')));
    const workbook = xlsx.readFile(dataPath);
    const sheetName = mappingConfig.sheet || workbook.SheetNames[0];
    const dataRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    report.totalRows = dataRows.length;

    const defaultCashAccountId = findOrCreate('account', mappingConfig.options.defaultCashAccountName, { type: 'asset' });

    const importTransaction = db.transaction((rows: any[]) => {
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowIndex = i + 2;
            try {
                // 1. Extract and Normalize data
                const dateRaw = getColumnValue(row, mappingConfig.mappings.date);
                const kindRaw = getColumnValue(row, mappingConfig.mappings.kind);
                const amountRaw = getColumnValue(row, mappingConfig.mappings.amount);
                const targetAccountName = getColumnValue(row, mappingConfig.mappings.account);
                const partyName = mappingConfig.mappings.party ? getColumnValue(row, mappingConfig.mappings.party) : null;
                const partnerName = mappingConfig.mappings.partner ? getColumnValue(row, mappingConfig.mappings.partner) : null;
                const notes = mappingConfig.mappings.notes ? getColumnValue(row, mappingConfig.mappings.notes) : '';
                const methodRaw = mappingConfig.mappings.method ? getColumnValue(row, mappingConfig.mappings.method) : 'cash';

                const kind = normalizeValue(kindRaw, mappingConfig.mappings.kind);
                const method = mappingConfig.mappings.method ? normalizeValue(methodRaw, mappingConfig.mappings.method) : 'cash';

                // 2. Parse and Validate
                const date = dayjs(dateRaw, mappingConfig.dateFormat).format('YYYY-MM-DD');
                if (!dayjs(date).isValid()) throw new Error(`Invalid date format for value: ${dateRaw}`);

                const amountStr = String(amountRaw).replace(mappingConfig.decimalSeparator || ',', '.');
                const amount = parseFloat(amountStr);
                if (isNaN(amount)) throw new Error(`Invalid amount: ${amountRaw}`);

                // 3. Find or Create dependencies
                const targetAccountId = findOrCreate('account', targetAccountName, { type: kind === 'receipt' ? 'revenue' : 'expense' });
                const partyId = partyName && mappingConfig.options.createMissingParties ? findOrCreate('party', partyName, { kind: 'customer' }) : null;
                const partnerId = partnerName && mappingConfig.options.createMissingPartners ? findOrCreate('partner', partnerName) : null;

                // 4. Create Voucher
                // We replicate the core logic here to stay within the parent transaction.
                const voucherStmt = db.prepare(`INSERT INTO vouchers (date, kind, account_id, party_id, partner_id, amount, method, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`);
                const voucherResult = voucherStmt.run(date, kind, defaultCashAccountId, partyId, partnerId, amount, method, notes);
                const voucherId = voucherResult.lastInsertRowid as number;

                const entryStmt = db.prepare(`INSERT INTO entries (voucher_id, account_id, debit, credit, date, notes) VALUES (?, ?, ?, ?, ?, ?)`);
                if (kind === 'receipt') {
                    entryStmt.run(voucherId, defaultCashAccountId, amount, 0, date, notes);
                    entryStmt.run(voucherId, targetAccountId, 0, amount, date, notes);
                } else {
                    entryStmt.run(voucherId, targetAccountId, amount, 0, date, notes);
                    entryStmt.run(voucherId, defaultCashAccountId, 0, amount, date, notes);
                }

                report.importedCount++;
            } catch (error) {
                report.skippedCount++;
                report.errors.push({ row: rowIndex, message: error instanceof Error ? error.message : String(error), data: row });
            }
        }
    });

    importTransaction(dataRows);

    return report;
}
