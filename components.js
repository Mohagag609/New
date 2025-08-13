/**
 * @file components.js
 * Contains functions that generate HTML components for the application.
 */

/**
 * Creates an HTML option element.
 * @param {object} item - The data object for the option.
 * @param {string} valueKey - The key to use for the option's value attribute.
 * @param {string} textKey - The key to use for the option's text content.
 * @returns {HTMLOptionElement} The created option element.
 */
function createOptionElement(item, valueKey = 'id', textKey = 'name') {
    const option = document.createElement('option');
    option.value = item[valueKey];
    option.textContent = item[textKey];
    return option;
}

/**
 * Creates the HTML component for a single treasury.
 * @param {object} treasury - The treasury object.
 * @returns {string} The HTML string for the treasury component.
 */
function createTreasuryComponent(treasury) {
    // Format balance to 2 decimal places and add currency symbol/code if desired
    const formattedBalance = parseFloat(treasury.balance).toLocaleString('ar-EG', {
        style: 'currency',
        currency: 'EGP', // Example currency, can be changed
        minimumFractionDigits: 2
    });

    return `
        <div class="list-item treasury-item" data-id="${treasury.id}">
            <p>${treasury.name}</p>
            <p class="balance">${formattedBalance}</p>
        </div>
    `;
}

/**
 * Creates the HTML component for a single party (customer/supplier).
 * @param {object} party - The party object.
 * @returns {string} The HTML string for the party component.
 */
function createPartyComponent(party) {
    const partyTypeDisplay = party.type === 'customer' ? 'عميل' : 'مورد';
    return `
        <div class="list-item party-item" data-id="${party.id}">
            <p>${party.name}</p>
            <p class="party-type">${partyTypeDisplay}</p>
        </div>
    `;
}

/**
 * Creates the HTML component for a single transaction.
 * @param {object} transaction - The transaction object.
 * @param {object} data - The full data state to look up names (treasuries, parties).
 * @returns {string} The HTML string for the transaction component.
 */
function createTransactionComponent(transaction, data) {
    const {
        id,
        type,
        amount,
        treasuryId,
        partyId,
        toTreasuryId,
        customTypeId, // new field
        description,
        createdAt
    } = transaction;

    const fromTreasury = data.treasuries.find(t => t.id === treasuryId);
    const party = data.parties.find(p => p.id === partyId);
    const toTreasury = data.treasuries.find(t => t.id === toTreasuryId);
    const customType = data.transactionTypes.find(t => t.id === customTypeId);

    const formattedAmount = parseFloat(amount).toLocaleString('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 2
    });

    const date = new Date(createdAt).toLocaleString('ar-EG');

    let details = '';
    let typeDisplay = '';

    switch (type) {
        case 'income':
            typeDisplay = 'إيصال قبض';
            details = `من: ${party ? party.name : 'جهة محذوفة'} | إلى خزينة: ${fromTreasury ? fromTreasury.name : 'خزينة محذوفة'}`;
            break;
        case 'expense':
            typeDisplay = 'إيصال دفع';
            details = `إلى: ${party ? party.name : 'جهة محذوفة'} | من خزينة: ${fromTreasury ? fromTreasury.name : 'خزينة محذوفة'}`;
            break;
        case 'transfer':
            typeDisplay = 'تحويل';
            details = `من خزينة: ${fromTreasury ? fromTreasury.name : 'خزينة محذوفة'} | إلى خزينة: ${toTreasury ? toTreasury.name : 'خزينة محذوفة'}`;
            break;
    }

    // Also change typeDisplay for the title
    const title = type === 'transfer' ? 'تحويل' : typeDisplay;

    const customTypeInfo = customType ? ` (${customType.name})` : '';

    return `
        <div class="list-item transaction-item ${type}" data-id="${id}">
            <div>
                <p><strong>${title}${customTypeInfo}:</strong> <span class="amount">${formattedAmount}</span></p>
                <p class="transaction-details">${details}</p>
                ${description ? `<p class="transaction-details"><em>الوصف: ${description}</em></p>` : ''}
            </div>
            <div class="transaction-actions">
                <p class="transaction-details">${date}</p>
                <button class="btn-print" data-transaction-id="${id}">طباعة</button>
            </div>
        </div>
    `;
}
