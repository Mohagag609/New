/**
 * @file app.js
 * Core application logic for the Treasury Management System.
 * This file is now designed to work across multiple pages.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection --- //
    // This will now select elements that might or might not be on the current page.
    // We will check for their existence before using them.
    const addTreasuryForm = document.getElementById('add-treasury-form');
    const treasuriesList = document.getElementById('treasuries-list');

    const addPartyForm = document.getElementById('add-party-form');
    const partiesList = document.getElementById('parties-list');

    const addTransactionForm = document.getElementById('add-transaction-form');
    const transactionsList = document.getElementById('transactions-list');
    const transactionTypeSelect = document.getElementById('transaction-type');
    const partyGroup = document.getElementById('party-group');
    const toTreasuryGroup = document.getElementById('to-treasury-group');

    // --- Page-Specific Initializers --- //

    function initTreasuriesPage() {
        const treasuryNameInput = document.getElementById('treasury-name');
        const treasuryBalanceInput = document.getElementById('treasury-balance');

        function renderTreasuries() {
            const treasuries = storage.getAll('treasuries');
            if (treasuriesList) {
                treasuriesList.innerHTML = treasuries.map(createTreasuryComponent).join('');
            }
        }

        if (addTreasuryForm) {
            addTreasuryForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const name = treasuryNameInput.value.trim();
                const balance = parseFloat(treasuryBalanceInput.value);

                if (name && !isNaN(balance)) {
                    storage.addItem('treasuries', { name, balance });
                    renderTreasuries();
                    addTreasuryForm.reset();
                } else {
                    alert('يرجى إدخال اسم ورصيد صحيحين.');
                }
            });
        }
        renderTreasuries();
    }

    function initPartiesPage() {
        const partyNameInput = document.getElementById('party-name');
        const partyTypeInput = document.getElementById('party-type');

        function renderParties() {
            const parties = storage.getAll('parties');
            if (partiesList) {
                partiesList.innerHTML = parties.map(createPartyComponent).join('');
            }
        }

        if (addPartyForm) {
            addPartyForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const name = partyNameInput.value.trim();
                const type = partyTypeInput.value;

                if (name) {
                    storage.addItem('parties', { name, type });
                    renderParties();
                    addPartyForm.reset();
                } else {
                    alert('يرجى إدخال اسم الجهة.');
                }
            });
        }
        renderParties();
    }

    function initTransactionsPage() {
        // Elements for the Add Transaction form
        const transactionTreasurySelect = document.getElementById('transaction-treasury');
        const transactionPartySelect = document.getElementById('transaction-party');
        const transactionToTreasurySelect = document.getElementById('transaction-to-treasury');
        const transactionAmountInput = document.getElementById('transaction-amount');
        const transactionDescriptionInput = document.getElementById('transaction-description');

        // Elements for the Filter form
        const filterForm = document.getElementById('filter-form');
        const filterStartDate = document.getElementById('filter-start-date');
        const filterEndDate = document.getElementById('filter-end-date');
        const filterType = document.getElementById('filter-type');
        const filterTreasury = document.getElementById('filter-treasury');
        const filterResetBtn = document.getElementById('filter-reset-btn');

        function renderTransactions(filters = {}) {
            let transactions = storage.getAll('transactions');
            const data = storage.getState();

            // Apply filters
            if (filters.startDate) {
                transactions = transactions.filter(t => new Date(t.createdAt).setHours(0,0,0,0) >= new Date(filters.startDate).setHours(0,0,0,0));
            }
            if (filters.endDate) {
                transactions = transactions.filter(t => new Date(t.createdAt).setHours(0,0,0,0) <= new Date(filters.endDate).setHours(0,0,0,0));
            }
            if (filters.type) {
                transactions = transactions.filter(t => t.type === filters.type);
            }
            if (filters.treasuryId) {
                const treasuryId = parseInt(filters.treasuryId, 10);
                transactions = transactions.filter(t => t.treasuryId === treasuryId || t.toTreasuryId === treasuryId);
            }

            transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            if (transactionsList) {
                transactionsList.innerHTML = transactions.map(t => createTransactionComponent(t, data)).join('');
            }
        }

        function applyFilters() {
            const filters = {
                startDate: filterStartDate.value,
                endDate: filterEndDate.value,
                type: filterType.value,
                treasuryId: filterTreasury.value
            };
            renderTransactions(filters);
        }
        
        function populateFilterDropdowns() {
            const treasuries = storage.getAll('treasuries');
            if (filterTreasury) {
                filterTreasury.innerHTML = '<option value="">كل الخزائن</option>';
                treasuries.forEach(t => {
                    filterTreasury.appendChild(createOptionElement(t));
                });
            }
        }
        
        function updateAddTransactionDropdowns() {
            const treasuries = storage.getAll('treasuries');
            const parties = storage.getAll('parties');

            if (transactionTreasurySelect) transactionTreasurySelect.innerHTML = '<option value="">اختر خزينة...</option>';
            if (transactionToTreasurySelect) transactionToTreasurySelect.innerHTML = '<option value="">اختر خزينة...</option>';
            if (transactionPartySelect) transactionPartySelect.innerHTML = '<option value="">اختر الجهة...</option>';

            treasuries.forEach(t => {
                if (transactionTreasurySelect) transactionTreasurySelect.appendChild(createOptionElement(t));
                if (transactionToTreasurySelect) transactionToTreasurySelect.appendChild(createOptionElement(t));
            });
            parties.forEach(p => {
                if (transactionPartySelect) transactionPartySelect.appendChild(createOptionElement(p));
            });
        }

        function handleTransactionTypeChange() {
            if (!transactionTypeSelect) return;
            const type = transactionTypeSelect.value;
            if (type === 'transfer') {
                partyGroup.style.display = 'none';
                toTreasuryGroup.style.display = 'block';
            } else {
                partyGroup.style.display = 'block';
                toTreasuryGroup.style.display = 'none';
            }
        }

        if (addTransactionForm) {
            addTransactionForm.addEventListener('submit', (event) => {
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
                if ((type === 'expense' || type === 'transfer') && parseFloat(fromTreasury.balance) < amount) {
                    alert('الرصيد في الخزينة غير كافٍ لإتمام العملية.');
                    return;
                }
                if (type === 'transfer' && (isNaN(toTreasuryId) || fromTreasuryId === toTreasuryId)) {
                    alert('يرجى اختيار خزينة مختلفة للتحويل إليها.');
                    return;
                }
                if ((type === 'income' || type === 'expense') && isNaN(partyId)) {
                    alert('يرجى اختيار جهة (عميل أو مورد).');
                    return;
                }

                fromTreasury.balance = parseFloat(fromTreasury.balance);
                let newFromBalance = fromTreasury.balance;
                if (type === 'income') newFromBalance += amount;
                else if (type === 'expense') newFromBalance -= amount;
                else if (type === 'transfer') {
                    newFromBalance -= amount;
                    const toTreasury = storage.getItemById('treasuries', toTreasuryId);
                    if (toTreasury) {
                        const newToBalance = parseFloat(toTreasury.balance) + amount;
                        storage.updateItem('treasuries', toTreasuryId, { balance: newToBalance });
                    }
                }
                storage.updateItem('treasuries', fromTreasuryId, { balance: newFromBalance });
                storage.addItem('transactions', { type, amount, treasuryId: fromTreasuryId, partyId: type !== 'transfer' ? partyId : null, toTreasuryId: type === 'transfer' ? toTreasuryId : null, description });

                applyFilters(); // Re-render with current filters
                updateAddTransactionDropdowns();
                addTransactionForm.reset();
                handleTransactionTypeChange();
            });
        }

        if (transactionTypeSelect) {
            transactionTypeSelect.addEventListener('change', handleTransactionTypeChange);
        }

        if (filterForm) {
            filterStartDate.addEventListener('change', applyFilters);
            filterEndDate.addEventListener('change', applyFilters);
            filterType.addEventListener('change', applyFilters);
            filterTreasury.addEventListener('change', applyFilters);
            filterResetBtn.addEventListener('click', () => {
                filterForm.reset();
                applyFilters();
            });
        }

        if (transactionsList) {
            transactionsList.addEventListener('click', (event) => {
                if (event.target.classList.contains('btn-print')) {
                    const transactionId = parseInt(event.target.getAttribute('data-transaction-id'), 10);
                    const transaction = storage.getItemById('transactions', transactionId);
                    const allData = storage.getState();

                    if (transaction) {
                        const fromTreasury = allData.treasuries.find(t => t.id === transaction.treasuryId);
                        const party = allData.parties.find(p => p.id === transaction.partyId);
                        const toTreasury = allData.treasuries.find(t => t.id === transaction.toTreasuryId);

                        let details = '';
                        let title = '';

                        switch (transaction.type) {
                            case 'income':
                                title = 'إيصال قبض';
                                details = `استلمنا من السيد/الجهة: ${party ? party.name : 'N/A'}`;
                                break;
                            case 'expense':
                                title = 'إيصال دفع';
                                details = `تم دفع مبلغ إلى السيد/الجهة: ${party ? party.name : 'N/A'}`;
                                break;
                            case 'transfer':
                                title = 'إيصال تحويل';
                                details = `تحويل من خزينة ${fromTreasury ? fromTreasury.name : 'N/A'} إلى خزينة ${toTreasury ? toTreasury.name : 'N/A'}`;
                                break;
                        }

                        const printableData = {
                            id: transaction.id,
                            title: title,
                            date: new Date(transaction.createdAt).toLocaleString('ar-EG'),
                            amount: parseFloat(transaction.amount).toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' }),
                            details: details,
                            description: transaction.description || 'لا يوجد'
                        };

                        localStorage.setItem('printableTransaction', JSON.stringify(printableData));

                        window.open('receipt.html', '_blank', 'width=800,height=600');
                    }
                }
            });
        }

        // Initial render for the page
        populateFilterDropdowns();
        applyFilters(); // Initial render with (empty) filters
        updateAddTransactionDropdowns();
        handleTransactionTypeChange();
    }


    function initReportsPage() {
        const totalBalanceEl = document.getElementById('total-balance');
        const totalIncomeEl = document.getElementById('total-income');
        const totalExpensesEl = document.getElementById('total-expenses');
        const netFlowEl = document.getElementById('net-flow');

        function calculateAndRenderReports() {
            const treasuries = storage.getAll('treasuries');
            const transactions = storage.getAll('transactions');

            const totalBalance = treasuries.reduce((sum, t) => sum + parseFloat(t.balance), 0);

            const totalIncome = transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);

            const totalExpenses = transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);

            const netFlow = totalIncome - totalExpenses;

            const formatCurrency = (num) => num.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });

            if (totalBalanceEl) totalBalanceEl.textContent = formatCurrency(totalBalance);
            if (totalIncomeEl) totalIncomeEl.textContent = formatCurrency(totalIncome);
            if (totalExpensesEl) totalExpensesEl.textContent = formatCurrency(totalExpenses);
            if (netFlowEl) netFlowEl.textContent = formatCurrency(netFlow);
        }

        calculateAndRenderReports();
    }


    // --- Main Initializer --- //
    // Determines which page is loaded and runs the correct initializer.
    function init() {
        if (document.getElementById('treasuries-section')) {
            initTreasuriesPage();
        }
        if (document.getElementById('parties-section')) {
            initPartiesPage();
        }
        if (document.getElementById('transaction-section')) {
            initTransactionsPage();
        }
        if (document.getElementById('report-summary')) { // Check for the report page
            initReportsPage();
        }
    }

    init();
});
