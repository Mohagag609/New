const db = new Dexie('TreasuryDB');

// This is the final, unified, and correct schema.
// All previous versions are deprecated. A full data clear is required by the user.
db.version(10).stores({
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
    vouchers: '++id, &voucherNo, [cashboxId+date], transferId, partyId, accountId, movementType, projectId, date, paidByInvestorId',
    // settlement_vouchers is now obsolete. All expenses are recorded in the main `vouchers` table.
    // Settlement transactions are now ephemeral and calculated on the fly.
    settlement_vouchers: null,
    adjustments: '++id, projectId, date',
    project_settlements: '++id, [projectId+settlementDate], projectId, settlementDate'
});

// Open the database
db.open().catch(function (e) {
    console.error("Open failed: " + e.stack);
});
