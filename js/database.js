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
    // Keep tables from version 1, but add the projectId index to them
    cashboxes: '++id, &name, projectId',
    parties: '++id, &[type+name], projectId',
    accounts: '++id, &[type+name], projectId',
    vouchers: '++id, &voucherNo, [cashboxId+date], transferId, partyId, accountId, movementType, projectId, date'
});


// Open the database
db.open().catch(function (e) {
    console.error("Open failed: " + e.stack);
});
