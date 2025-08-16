const db = new Dexie('TreasuryDB');

// Version 1: Initial Schema
db.version(1).stores({
    cashboxes: '++id, &name',
    parties: '++id, &[type+name]',
    accounts: '++id, &[type+name]',
    vouchers: '++id, &voucherNo, [cashboxId+date], transferId, partyId, accountId, movementType',
});

// Version 2: Unified Schema
// This version merges the tables from the old SettlementDB into the main TreasuryDB
// to create a single source of truth for all application data.
db.version(2).stores({
    // Core Treasury Tables (upgraded with projectId)
    cashboxes: '++id, &name, projectId',
    parties: '++id, &[type+name], projectId',
    accounts: '++id, &[type+name], projectId',
    vouchers: '++id, &voucherNo, [cashboxId+date], transferId, partyId, accountId, movementType, projectId, date',

    // Tables from the former SettlementDB
    projects: '++id, &name, status',
    investors: '++id, &name, isActive',
    project_investors: '++id, &[projectId+investorId], projectId, investorId',
    settlement_vouchers: '++id, projectId, date, categoryId, paidByInvestorId, receivedByInvestorId',
    expense_categories: '++id, &name',
    adjustments: '++id, projectId, date'
});

// Open the database
db.open().catch(function (e) {
    console.error("Open failed: " + e.stack);
});
