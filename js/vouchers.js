document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-vouchers');
    if (!page) return;

    const currentProjectId = Number(localStorage.getItem('currentProjectId'));
    if (!currentProjectId) {
        // Hide action buttons if no project is selected
        document.getElementById('new-receipt-btn').style.display = 'none';
        document.getElementById('new-payment-btn').style.display = 'none';
        document.getElementById('new-transfer-btn').style.display = 'none';
        return;
    }

    // --- DOM Elements ---
    const newReceiptBtn = document.getElementById('new-receipt-btn');
    const newPaymentBtn = document.getElementById('new-payment-btn');
    const newTransferBtn = document.getElementById('new-transfer-btn');
    const modal = document.getElementById('voucher-modal');
    const modalTitle = document.getElementById('voucher-modal-title');
    const form = document.getElementById('voucher-form');
    const cancelBtn = document.getElementById('cancel-voucher-btn');
    const tableBody = document.getElementById('vouchers-table-body');

    // Filter fields
    const filterFromDate = document.getElementById('voucher-filter-from-date');
    const filterToDate = document.getElementById('voucher-filter-to-date');
    const filterBtn = document.getElementById('voucher-filter-btn');

    // Form fields
    const voucherIdInput = document.getElementById('voucher-id');
    const voucherNoInput = document.getElementById('voucher-no');
    const voucherDateInput = document.getElementById('voucher-date');
    const movementTypeSelect = document.getElementById('voucher-movement-type');

    const standardFields = document.getElementById('standard-fields');
    const cashboxSelect = document.getElementById('voucher-cashbox');
    const partySelect = document.getElementById('voucher-party');
    const accountSelect = document.getElementById('voucher-account');
    const onBehalfInvestorContainer = document.getElementById('on-behalf-investor-container');
    const onBehalfInvestorSelect = document.getElementById('voucher-on-behalf-investor');

    const transferFields = document.getElementById('transfer-fields');
    const fromCashboxSelect = document.getElementById('from-cashbox');
    const toCashboxSelect = document.getElementById('to-cashbox');

    const descriptionInput = document.getElementById('voucher-description');
    const debitInput = document.getElementById('voucher-debit');
    const creditInput = document.getElementById('voucher-credit');

    let currentVoucherMode = 'Receipt'; // Receipt, Payment, Transfer

    // --- Data Population ---
    const populateSelect = async (selectElement, getItems, placeholder, nameField = 'name') => {
        try {
            const items = await getItems();
            selectElement.innerHTML = `<option value="">${placeholder}</option>`;
            items.forEach(item => {
                if (item.isActive !== false) { // Exclude inactive items
                    const option = document.createElement('option');
                    option.value = item.id;
                    option.textContent = item[nameField];
                    selectElement.appendChild(option);
                }
            });
        } catch (error) {
            console.error(`Failed to populate ${selectElement.id}:`, error);
        }
    };

    const populateAllDropdowns = () => {
        const query = { projectId: currentProjectId };
        populateSelect(cashboxSelect, () => db.cashboxes.where(query).toArray(), 'اختر الخزنة');
        populateSelect(fromCashboxSelect, () => db.cashboxes.where(query).toArray(), 'اختر الخزنة');
        populateSelect(toCashboxSelect, () => db.cashboxes.where(query).toArray(), 'اختر الخزنة');
        populateSelect(partySelect, () => db.parties.where(query).toArray(), 'اختر الطرف (اختياري)');
    };

    const populateAccountsDropdown = async (type) => {
        await populateSelect(accountSelect, () => db.accounts.where({ type: type, projectId: currentProjectId }).toArray(), 'اختر الحساب');
    };

    const populateInvestorsDropdown = async () => {
        const settlementProjectId = Number(localStorage.getItem('currentSettlementProjectId'));
        if (!settlementProjectId) {
            onBehalfInvestorSelect.innerHTML = '<option value="">الرجاء تحديد مشروع أولاً</option>';
            return;
        };

        const getProjectInvestors = async () => {
            // First, find which investors are linked to the current project via the join table.
            const links = await settlementDb.project_investors.where({ projectId: settlementProjectId }).toArray();
            const investorIds = links.map(link => link.investorId);

            if (investorIds.length === 0) {
                return []; // No investors linked to this project
            }

            // Now, fetch the actual investor details for the linked investors.
            return settlementDb.investors.where('id').anyOf(investorIds).toArray();
        };

        await populateSelect(onBehalfInvestorSelect, getProjectInvestors, 'اختر المستثمر (اختياري)');
    };


    // --- Voucher Number ---
    // This logic is now handled inside the form submission transaction for safety.
    const generateVoucherNo = async () => {
        // DEPRECATED - new logic is transactional.
        return 1;
    };

    // --- UI Configuration ---
    const configureFormForMode = (mode) => {
        currentVoucherMode = mode;
        standardFields.classList.remove('hidden');
        transferFields.classList.add('hidden');
        debitInput.parentElement.classList.remove('hidden');
        creditInput.parentElement.classList.remove('hidden');
        accountSelect.parentElement.classList.remove('hidden');
        partySelect.parentElement.classList.remove('hidden');
        onBehalfInvestorContainer.classList.add('hidden'); // Hide by default

        debitInput.disabled = false;
        creditInput.disabled = false;

        switch (mode) {
            case 'Receipt':
                modalTitle.textContent = 'إنشاء سند قبض';
                creditInput.value = 0;
                creditInput.disabled = true;
                populateAccountsDropdown('Revenue');
                break;
            case 'Payment':
                modalTitle.textContent = 'إنشاء سند صرف';
                debitInput.value = 0;
                debitInput.disabled = true;
                populateAccountsDropdown('Expense');
                populateInvestorsDropdown(); // <-- Add this call
                onBehalfInvestorContainer.classList.remove('hidden'); // Show for Payment
                break;
            case 'Transfer':
                modalTitle.textContent = 'إنشاء تحويل مالي';
                standardFields.classList.add('hidden');
                transferFields.classList.remove('hidden');
                // For transfer, user enters one amount, which becomes credit for one and debit for other
                creditInput.parentElement.classList.add('hidden');
                debitInput.previousElementSibling.textContent = 'المبلغ';
                break;
        }
    };

    // --- Modal Management ---
    const openModal = async (mode, voucher = null) => {
        form.reset();

        // Populate and set the movement type dropdown first
        movementTypeSelect.innerHTML = `
            <option value="Receipt">سند قبض</option>
            <option value="Payment">سند صرف</option>
            <option value="Transfer">تحويل</option>
        `;
        movementTypeSelect.value = mode;

        voucherDateInput.valueAsDate = new Date(); // Default to today
        populateAllDropdowns();

        if (voucher) {
            // Logic for editing an existing voucher will be implemented later
            modalTitle.textContent = 'تعديل سند';
            // ... populate fields from voucher object
        } else {
            // New voucher
            voucherNoInput.value = '';
            voucherNoInput.placeholder = 'سيتم إنشاؤه تلقائيًا';
            configureFormForMode(mode);
        }
        modal.classList.remove('hidden');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    // --- Main Render Function ---
    const renderVouchers = async (filters = {}) => {
        try {
            let allVouchers = await db.vouchers.where({ projectId: currentProjectId }).reverse().toArray();

            if (filters.fromDate && filters.toDate) {
                allVouchers = allVouchers.filter(v => v.date >= filters.fromDate && v.date <= filters.toDate);
            }

            const [cashboxes, parties] = await Promise.all([
                db.cashboxes.where({ projectId: currentProjectId }).toArray(),
                db.parties.where({ projectId: currentProjectId }).toArray()
            ]);
            const vouchers = allVouchers;

            const cashboxMap = new Map(cashboxes.map(c => [c.id, c.name]));
            const partyMap = new Map(parties.map(p => [p.id, p.name]));

            if (vouchers.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="8" class="text-center p-4">لا توجد سندات لعرضها حاليًا.</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            vouchers.forEach(v => {
                const row = document.createElement('tr');
                const movementTypeText = {
                    'Receipt': 'قبض',
                    'Payment': 'صرف',
                    'TransferIn': 'تحويل وارد',
                    'TransferOut': 'تحويل صادر'
                }[v.movementType];

                row.innerHTML = `
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${v.voucherNo}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${v.date}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${cashboxMap.get(v.cashboxId) || 'N/A'}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${movementTypeText}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${v.description}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm text-green-600">${v.debit > 0 ? new Intl.NumberFormat().format(v.debit) : '-'}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm text-red-600">${v.credit > 0 ? new Intl.NumberFormat().format(v.credit) : '-'}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <button class="print-btn bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-2 rounded" data-id="${v.id}">طباعة</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

        } catch (error) {
            console.error('Failed to render vouchers:', error);
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center p-4 text-red-500">حدث خطأ أثناء تحميل السندات.</td></tr>';
        }
    };

    // --- Event Listeners ---
    newReceiptBtn.addEventListener('click', () => openModal('Receipt'));
    newPaymentBtn.addEventListener('click', () => openModal('Payment'));
    newTransferBtn.addEventListener('click', () => openModal('Transfer'));
    cancelBtn.addEventListener('click', closeModal);

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const now = new Date().toISOString();

        try {
            if (currentVoucherMode === 'Transfer') {
                const fromId = Number(fromCashboxSelect.value);
                const toId = Number(toCashboxSelect.value);
                const amount = Number(debitInput.value);

                if (!fromId || !toId) return alert('الرجاء تحديد خزنة المصدر والهدف.');
                if (fromId === toId) return alert('لا يمكن التحويل من وإلى نفس الخزنة.');
                if (amount <= 0) return alert('يجب أن يكون مبلغ التحويل أكبر من صفر.');

                const transferId = `TFR-${Date.now()}`;

                await db.transaction('rw', db.vouchers, async () => {
                    const lastVoucher = await db.vouchers.orderBy('id').last();
                    let lastNo = 0;
                    if (lastVoucher && lastVoucher.voucherNo) {
                        if (String(lastVoucher.voucherNo).includes('-')) {
                            lastNo = parseInt(lastVoucher.voucherNo.split('-')[1], 10);
                        } else {
                            lastNo = parseInt(lastVoucher.voucherNo, 10);
                        }
                    }
                    const voucherNoOut = isNaN(lastNo) ? 1 : lastNo + 1;
                    const voucherNoIn = isNaN(lastNo) ? 2 : lastNo + 2;

                    const toCashboxText = toCashboxSelect.options[toCashboxSelect.selectedIndex].text;
                    const fromCashboxText = fromCashboxSelect.options[fromCashboxSelect.selectedIndex].text;

                    await db.vouchers.bulkAdd([
                        {
                            voucherNo: voucherNoOut,
                            date: voucherDateInput.value,
                            cashboxId: fromId,
                            movementType: 'TransferOut',
                            description: `تحويل إلى ${toCashboxText}. ${descriptionInput.value}`,
                            debit: 0, credit: amount, transferId, createdAt: now, updatedAt: now,
                            projectId: currentProjectId
                        },
                        {
                            voucherNo: voucherNoIn,
                            date: voucherDateInput.value,
                            cashboxId: toId,
                            movementType: 'TransferIn',
                            description: `تحويل من ${fromCashboxText}. ${descriptionInput.value}`,
                            debit: amount, credit: 0, transferId, createdAt: now, updatedAt: now,
                            projectId: currentProjectId
                        }
                    ]);
                });
                alert('تم تسجيل عملية التحويل بنجاح.');

            } else { // Receipt or Payment
                const voucherData = {
                    date: voucherDateInput.value,
                    cashboxId: Number(cashboxSelect.value),
                    movementType: currentVoucherMode,
                    partyId: Number(partySelect.value) || null,
                    accountId: Number(accountSelect.value) || null,
                    description: descriptionInput.value.trim(),
                    debit: Number(debitInput.value),
                    credit: Number(creditInput.value),
                    createdAt: now,
                    updatedAt: now,
                    projectId: currentProjectId
                };

                if (!voucherData.cashboxId) return alert('الرجاء اختيار خزنة.');
                if (!voucherData.accountId) return alert('الرجاء اختيار حساب.');
                if (voucherData.debit <= 0 && voucherData.credit <= 0) return alert('يجب إدخال مبلغ.');
                if (voucherData.debit > 0 && voucherData.credit > 0) return alert('لا يمكن إدخال مبلغ في المدين والدائن معًا.');
                if (currentVoucherMode === 'Receipt' && voucherData.debit <= 0) return alert('مبلغ القبض يجب أن يكون أكبر من صفر.');
                if (currentVoucherMode === 'Payment' && voucherData.credit <= 0) return alert('مبلغ الصرف يجب أن يكون أكبر من صفر.');

                const onBehalfInvestorId = Number(onBehalfInvestorSelect.value);

                // If an investor is selected for a payment, perform a dual-DB transaction
                if (currentVoucherMode === 'Payment' && onBehalfInvestorId) {

                    // Get the project ID from the settlement context
                    const settlementProjectId = Number(localStorage.getItem('currentSettlementProjectId'));
                    if (!settlementProjectId) {
                        return alert('خطأ: لم يتم تحديد مشروع تسوية حالي. لا يمكن حفظ المصروف.');
                    }

                    await Dexie.transaction('rw', db.vouchers, settlementDb.settlement_vouchers, async () => {
                        // 1. Create Treasury Voucher
                        const lastVoucher = await db.vouchers.orderBy('id').last();
                        let lastNo = 0;
                        if (lastVoucher && lastVoucher.voucherNo) {
                           if (String(lastVoucher.voucherNo).includes('-')) {
                                lastNo = parseInt(lastVoucher.voucherNo.split('-')[1], 10);
                            } else {
                                lastNo = parseInt(lastVoucher.voucherNo, 10);
                            }
                        }
                        voucherData.voucherNo = isNaN(lastNo) ? 1 : lastNo + 1;
                        // Add a note about the settlement
                        voucherData.description = `(مصروف تسوية) ${voucherData.description}`;
                        const treasuryVoucherId = await db.vouchers.add(voucherData);

                        // 2. Create Settlement Voucher
                        const settlementVoucherData = {
                            projectId: settlementProjectId,
                            date: voucherData.date,
                            // Note: We use the treasury accountId, assuming it maps conceptually
                            // to an expense category in the settlement system.
                            // A more robust system might have a dedicated mapping.
                            categoryId: voucherData.accountId,
                            amount: voucherData.credit, // The amount paid
                            paidByInvestorId: onBehalfInvestorId,
                            description: `(من الخزينة) ${voucherData.description}`,
                            treasuryVoucherId: treasuryVoucherId, // Link back to the treasury voucher
                            createdAt: now,
                            updatedAt: now
                        };
                        await settlementDB.settlement_vouchers.add(settlementVoucherData);
                    });
                     alert('تم حفظ سند الصرف ومصروف التسوية بنجاح.');

                } else {
                    // Standard, single-DB transaction
                    await db.transaction('rw', db.vouchers, async () => {
                        const lastVoucher = await db.vouchers.orderBy('id').last();
                        let lastNo = 0;
                        if (lastVoucher && lastVoucher.voucherNo) {
                            if (String(lastVoucher.voucherNo).includes('-')) {
                                lastNo = parseInt(lastVoucher.voucherNo.split('-')[1], 10);
                            } else {
                                lastNo = parseInt(lastVoucher.voucherNo, 10);
                            }
                        }
                        voucherData.voucherNo = isNaN(lastNo) ? 1 : lastNo + 1;
                        await db.vouchers.add(voucherData);
                    });

                    alert('تم حفظ السند بنجاح.');
                }
            }

            closeModal();
            renderVouchers();
        } catch (error) {
            console.error('Failed to save voucher:', error);
            if (error.name === 'ConstraintError') {
                alert('حدث خطأ في الحفظ، قد يكون رقم السند مكررًا.');
            } else {
                alert('حدث خطأ أثناء حفظ السند.');
            }
        }
    };

    form.addEventListener('submit', handleFormSubmit);

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-vouchers') {
            filterFromDate.value = '';
            filterToDate.value = '';
            renderVouchers();
        }
    });

    filterBtn.addEventListener('click', () => {
        const fromDate = filterFromDate.value;
        const toDate = filterToDate.value;
        if (fromDate && toDate) {
            renderVouchers({ fromDate, toDate });
        } else {
            alert('الرجاء تحديد تاريخ البداية والنهاية.');
        }
    });

    tableBody.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('print-btn')) {
            const voucherId = target.dataset.id;
            window.open(`print-voucher.html?id=${voucherId}`, '_blank', 'width=800,height=600');
        }
    });

    movementTypeSelect.addEventListener('change', (e) => {
        const newMode = e.target.value;
        configureFormForMode(newMode);
    });
});
