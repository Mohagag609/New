const db = new Dexie('TreasuryDB');

// This is the final, unified, and correct schema.
// All previous versions are deprecated. A full data clear is required by the user.
db.version(8).stores({
    // Global Tables
    cashboxes: '++id, &name, type',
    parties: '++id, &[type+name]',
    investors: '++id, &name, isActive',

    // Project-Specific Tables
    projects: '++id, &name, status',
    accounts: '++id, &[type+name], projectId',

    // Link Tables
    project_investors: '++id, &[projectId+investorId], projectId, investorId',

    // Transactional Tables
    vouchers: '++id, &voucherNo, [cashboxId+date], transferId, partyId, accountId, movementType, projectId, date, isSettlementExpense, paidByInvestorId, [projectId+isSettlementExpense+date]',
    settlement_vouchers: '++id', // DEPRECATED: This table is no longer in use as of the new architecture. All expenses are now in the main vouchers table.
    adjustments: '++id, projectId, date',
    project_settlements: '++id, [projectId+settlementDate]' // To store cumulative settlement snapshots
});

// Open the database
db.open().catch(function (e) {
    console.error("Open failed: " + e.stack);
});
