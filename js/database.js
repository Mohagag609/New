const db = new Dexie('TreasuryDB');

// This is the final, unified, and correct schema.
// All previous versions are deprecated. A full data clear is required by the user.
db.version(6).stores({
    // Global Tables
    cashboxes: '++id, &name, type', // Added type index to query for Main/Sub
    parties: '++id, &[type+name]', // Customers & Suppliers
    investors: '++id, &name, isActive',

    // Project-Specific Tables
    projects: '++id, &name, status',
    accounts: '++id, &[type+name], projectId', // Expense/Revenue accounts are per-project

    // Link Tables
    project_investors: '++id, &[projectId+investorId], projectId, investorId',

    // Transactional Tables
    vouchers: '++id, &voucherNo, [cashboxId+date], transferId, partyId, accountId, movementType, projectId, date',
    settlement_vouchers: '++id, projectId, date, accountId, paidByInvestorId, receivedByInvestorId, partyId',
    adjustments: '++id, projectId, date'
});

// Open the database
db.open().catch(function (e) {
    console.error("Open failed: " + e.stack);
});
