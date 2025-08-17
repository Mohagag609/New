const db = new Dexie('TreasuryDB');

db.version(9).stores({
    // Global Tables
    cashboxes: '++id, &name, type',
    parties: '++id, &[type+name]',
    investors: '++id, &name, isActive',

    // Project-Specific Tables
    projects: '++id, &name, status',
    accounts: '++id, &[type+name], projectId',

    // Link Tables
    project_investors: '++id, &[projectId+investorId], projectId, investorId',
    settlementRatios: '++id, &[projectId+investorId]',

    // Transactional Tables
    vouchers: '++id, &voucherNo, [cashboxId+date], [projectId+date], transferId, partyId, accountId, movementType, paidByInvestorId',
    settlement_vouchers: '++id, projectId, date, accountId, paidByInvestorId, receivedByInvestorId, partyId, type', // To be deprecated
    adjustments: '++id, projectId, date',

    // Settlement Snapshot Table
    project_settlements: '++id, projectId, settlementDate'
});

// Open the database
db.open().catch(function (e) {
    console.error("Open failed: " + e.stack);
});
