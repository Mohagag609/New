const db = new Dexie('TreasuryDB');

// Version 1: Initial Schema
db.version(1).stores({
    cashboxes: '++id, &name',
    parties: '++id, &[type+name]',
    accounts: '++id, &[type+name]',
    vouchers: '++id, &voucherNo, [cashboxId+date], transferId, partyId, accountId, movementType',
});

// Version 2: Multi-Project Architecture
// This is a breaking change and will require data to be re-seeded or migrated.
db.version(2).stores({
    projects: '++id, &name', // New table for projects
    investors: '++id, &name', // New table for investors
    project_investors: '++id, &[projectId+investorId], projectId, investorId', // Link table for M-M relationship

    // Update existing tables with projectId
    cashboxes: '++id, &name, projectId',
    parties: '++id, &[type+name], projectId',
    accounts: '++id, &[type+name], projectId',
    vouchers: '++id, &voucherNo, [cashboxId+date], transferId, partyId, accountId, movementType, projectId, date'
});


// Seed data function
async function seedInitialData() {
    try {
        await db.transaction('rw', db.projects, db.cashboxes, db.parties, db.accounts, async () => {
            const projectCount = await db.projects.count();
            if (projectCount > 0) {
                return; // Data already exists
            }

            console.log("Seeding initial data for multi-project setup...");

            // 1. Seed a default project
            const defaultProjectId = await db.projects.add({
                name: 'المشروع العام',
                description: 'هذا هو المشروع الافتراضي للعمليات العامة.'
            });

            // 2. Seed Cashboxes for the default project
            const mainCashboxId = await db.cashboxes.add({
                name: 'الخزنة الرئيسية',
                type: 'Main',
                openingBalance: 10000,
                isActive: true,
                projectId: defaultProjectId
            });

            await db.cashboxes.add({
                name: 'خزنة المكتب',
                type: 'Sub',
                parentId: mainCashboxId,
                openingBalance: 500,
                isActive: true,
                projectId: defaultProjectId
            });

            // 3. Seed Parties for the default project
            await db.parties.bulkAdd([
                { name: 'عميل نقدي', type: 'Customer', phone: 'N/A', notes: 'عميل للمعاملات النقدية السريعة', isActive: true, projectId: defaultProjectId },
                { name: 'مورد عام', type: 'Supplier', phone: 'N/A', notes: 'مورد عام للمشتريات المتنوعة', isActive: true, projectId: defaultProjectId }
            ]);

            // 4. Seed Accounts for the default project
            await db.accounts.bulkAdd([
                { name: 'مصروفات إدارية', type: 'Expense', isActive: true, projectId: defaultProjectId },
                { name: 'إيرادات مبيعات', type: 'Revenue', isActive: true, projectId: defaultProjectId },
                { name: 'رواتب وأجور', type: 'Expense', isActive: true, projectId: defaultProjectId }
            ]);
        });
        console.log("Database seeded successfully for multi-project setup.");
    } catch (error) {
        console.error("Failed to seed database:", error);
    }
}

// Open the database and then seed initial data
db.open().then(() => {
    console.log("Database opened successfully.");
    seedInitialData();
}).catch(function (e) {
    console.error("Open failed: " + e.stack);
});
