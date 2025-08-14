// Dexie.js database setup will go here
console.log("database.js loaded");

const db = new Dexie('TreasuryDB');

db.version(1).stores({
    /**
     * Cashboxes Table
     * - id: Primary Key, auto-increment
     * - name: Must be unique
     */
    cashboxes: '++id, &name',

    /**
     * Parties (Customers/Suppliers) Table
     * - id: Primary Key, auto-increment
     * - [type+name]: A compound index that must be unique. A customer and a supplier can have the same name,
     *   but two customers cannot.
     */
    parties: '++id, &[type+name]',

    /**
     * Accounts (Expense/Revenue) Table
     * - id: Primary Key, auto-increment
     * - [type+name]: A compound index that must be unique.
     */
    accounts: '++id, &[type+name]',

    /**
     * Vouchers Table
     * - id: Primary Key, auto-increment
     * - voucherNo: Must be unique
     * - [cashboxId+date]: Compound index for fast lookup of transactions for a specific cashbox in a date range.
     * - Other indexes for filtering.
     */
    vouchers: '++id, &voucherNo, [cashboxId+date], transferId, partyId, accountId, movementType',
});

// Seed data function
async function seedInitialData() {
    try {
        await db.transaction('rw', db.cashboxes, db.parties, db.accounts, async () => {
            const cashboxCount = await db.cashboxes.count();
            if (cashboxCount > 0) {
                // console.log("Database already contains data. Skipping seed.");
                return;
            }

            console.log("Seeding initial data...");

            // 1. Seed Cashboxes
            const mainCashboxId = await db.cashboxes.add({
                name: 'الخزنة الرئيسية',
                type: 'Main',
                openingBalance: 10000,
                isActive: true
            });

            await db.cashboxes.add({
                name: 'خزنة المكتب',
                type: 'Sub',
                parentId: mainCashboxId,
                openingBalance: 500,
                isActive: true
            });

            // 2. Seed Parties
            await db.parties.bulkAdd([
                { name: 'عميل نقدي', type: 'Customer', phone: 'N/A', notes: 'عميل للمعاملات النقدية السريعة', isActive: true },
                { name: 'مورد عام', type: 'Supplier', phone: 'N/A', notes: 'مورد عام للمشتريات المتنوعة', isActive: true }
            ]);

            // 3. Seed Accounts
            await db.accounts.bulkAdd([
                { name: 'مصروفات إدارية', type: 'Expense', isActive: true },
                { name: 'إيرادات مبيعات', type: 'Revenue', isActive: true },
                { name: 'رواتب وأجور', type: 'Expense', isActive: true }
            ]);
        });
        console.log("Database seeded successfully.");
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
