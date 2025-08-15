// This file defines the database for the Project Expense Settlement module.

const settlementDb = new Dexie('SettlementDB');

settlementDb.version(1).stores({
    // Projects table as per the new spec
    projects: '++id, &name, status',

    // Investors table
    investors: '++id, &name, isActive',

    // Link table for investors in a project, with their settlement ratio
    project_investors: '++id, &[projectId+investorId], projectId, investorId',

    // Vouchers for the settlement system (expenses and reimbursements)
    // Note: This is different from the treasury system's vouchers
    settlement_vouchers: '++id, projectId, date, categoryId, paidByInvestorId, receivedByInvestorId',

    // Categories for expenses
    expense_categories: '++id, &name',

    // Optional table for manual settlement adjustments
    adjustments: '++id, projectId, date'
});

// Open the database
settlementDb.open().catch(function (e) {
    console.error("Failed to open SettlementDB: " + e.stack);
});
