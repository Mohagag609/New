/**
 * @file app.js
 * Core application logic for the Treasury Management System.
 * This file ties together the storage, components, and user interface.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection --- //
    const addTreasuryForm = document.getElementById('add-treasury-form');
    const treasuryNameInput = document.getElementById('treasury-name');
    const treasuryBalanceInput = document.getElementById('treasury-balance');
    const treasuriesList = document.getElementById('treasuries-list');

    const addPartyForm = document.getElementById('add-party-form');
    const partyNameInput = document.getElementById('party-name');
    const partyTypeInput = document.getElementById('party-type');
    const partiesList = document.getElementById('parties-list');

    const addTransactionForm = document.getElementById('add-transaction-form');
    const transactionTypeSelect = document.getElementById('transaction-type');
    const transactionTreasurySelect = document.getElementById('transaction-treasury');
    const transactionPartySelect = document.getElementById('transaction-party');
    const transactionToTreasurySelect = document.getElementById('transaction-to-treasury');
    const transactionAmountInput = document.getElementById('transaction-amount');
    const transactionDescriptionInput = document.getElementById('transaction-description');
    const partyGroup = document.getElementById('party-group');
    const toTreasuryGroup = document.getElementById('to-treasury-group');
    const transactionsList = document.getElementById('transactions-list');


    // --- Render Functions --- //

    /**
     * Renders all treasuries to the page.
     */
    function renderTreasuries() {
        const treasuries = storage.getAll('treasuries');
        treasuriesList.innerHTML = treasuries.map(createTreasuryComponent).join('');
    }

    /**
     * Renders all parties to the page.
     */
    function renderParties() {
        const parties = storage.getAll('parties');
        partiesList.innerHTML = parties.map(createPartyComponent).join('');
    }

    /**
     * Renders all transactions to the page.
     */
    function renderTransactions() {
        const transactions = storage.getAll('transactions').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const data = storage.getState();
        transactionsList.innerHTML = transactions.map(t => createTransactionComponent(t, data)).join('');
    }

    /**
     * Updates the dropdown menus for treasuries and parties in the transaction form.
     */
    function updateDropdowns() {
        const treasuries = storage.getAll('treasuries');
        const parties = storage.getAll('parties');

        // Clear existing options
        transactionTreasurySelect.innerHTML = '<option value="">اختر خزينة...</option>';
        transactionToTreasurySelect.innerHTML = '<option value="">اختر خزينة...</option>';
        transactionPartySelect.innerHTML = '<option value="">اختر الجهة...</option>';

        // Populate treasuries
        treasuries.forEach(t => {
            transactionTreasurySelect.appendChild(createOptionElement(t));
            transactionToTreasurySelect.appendChild(createOptionElement(t));
        });

        // Populate parties
        parties.forEach(p => {
            transactionPartySelect.appendChild(createOptionElement(p, 'id', 'name'));
        });
    }

    // --- Event Handlers --- //

    function handleAddTreasury(event) {
        event.preventDefault();
        const name = treasuryNameInput.value.trim();
        const balance = parseFloat(treasuryBalanceInput.value);

        if (name && !isNaN(balance)) {
            storage.addItem('treasuries', { name, balance });
            renderAll();
            addTreasuryForm.reset();
        } else {
            alert('يرجى إدخال اسم ورصيد صحيحين.');
        }
    }

    function handleAddParty(event) {
        event.preventDefault();
        const name = partyNameInput.value.trim();
        const type = partyTypeInput.value;

        if (name) {
            storage.addItem('parties', { name, type });
            renderAll();
            addPartyForm.reset();
        } else {
            alert('يرجى إدخال اسم الجهة.');
        }
    }
    
    function handleTransactionTypeChange() {
        const type = transactionTypeSelect.value;
        if (type === 'transfer') {
            partyGroup.style.display = 'none';
            toTreasuryGroup.style.display = 'block';
        } else {
            partyGroup.style.display = 'block';
            toTreasuryGroup.style.display = 'none';
        }
    }

    function handleAddTransaction(event) {
        event.preventDefault();
        const type = transactionTypeSelect.value;
        const amount = parseFloat(transactionAmountInput.value);
        const fromTreasuryId = parseInt(transactionTreasurySelect.value, 10);
        const toTreasuryId = parseInt(transactionToTreasurySelect.value, 10);
        const partyId = parseInt(transactionPartySelect.value, 10);
        const description = transactionDescriptionInput.value.trim();

        if (isNaN(amount) || amount <= 0 || isNaN(fromTreasuryId)) {
            alert('يرجى ملء الحقول المطلوبة بشكل صحيح.');
            return;
        }

        const fromTreasury = storage.getItemById('treasuries', fromTreasuryId);
        if (!fromTreasury) {
            alert('لم يتم العثور على الخزينة المصدر.');
            return;
        }

        // --- Transaction Logic --- //
        if (type === 'expense' || type === 'transfer') {
            if (fromTreasury.balance < amount) {
                alert('الرصيد في الخزينة غير كافٍ لإتمام العملية.');
                return;
            }
        }
        
        if (type === 'transfer' && (isNaN(toTreasuryId) || fromTreasuryId === toTreasuryId)) {
             alert('يرجى اختيار خزينة مختلفة للتحويل إليها.');
             return;
        }
        
        if((type === 'income' || type === 'expense') && isNaN(partyId)) {
            alert('يرجى اختيار جهة (عميل أو مورد).');
            return;
        }
        
        // Update balances
        let newFromBalance = fromTreasury.balance;

        if (type === 'income') {
            newFromBalance += amount;
        } else if (type === 'expense') {
            newFromBalance -= amount;
        } else if (type === 'transfer') {
            newFromBalance -= amount;
            const toTreasury = storage.getItemById('treasuries', toTreasuryId);
            if(toTreasury) {
                const newToBalance = toTreasury.balance + amount;
                storage.updateItem('treasuries', toTreasuryId, { balance: newToBalance });
            }
        }
        
        storage.updateItem('treasuries', fromTreasuryId, { balance: newFromBalance });

        // Add transaction record
        storage.addItem('transactions', {
            type,
            amount,
            treasuryId: fromTreasuryId,
            partyId: type !== 'transfer' ? partyId : null,
            toTreasuryId: type === 'transfer' ? toTreasuryId : null,
            description
        });

        renderAll();
        addTransactionForm.reset();
        handleTransactionTypeChange(); // Reset form visibility
    }
    
    // --- Main Initializer --- //
    
    function renderAll() {
        renderTreasuries();
        renderParties();
        renderTransactions();
        updateDropdowns();
    }

    function init() {
        addTreasuryForm.addEventListener('submit', handleAddTreasury);
        addPartyForm.addEventListener('submit', handleAddParty);
        addTransactionForm.addEventListener('submit', handleAddTransaction);
        transactionTypeSelect.addEventListener('change', handleTransactionTypeChange);
        
        renderAll();
        handleTransactionTypeChange(); // Set initial form visibility
    }

    // Start the application
    init();
});
