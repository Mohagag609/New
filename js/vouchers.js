document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-vouchers');
    if (!page) return;

    // --- DOM Elements ---
    const newReceiptBtn = document.getElementById('new-receipt-btn');
    const newPaymentBtn = document.getElementById('new-payment-btn');
    const newTransferBtn = document.getElementById('new-transfer-btn');
    const modal = document.getElementById('voucher-modal');
    const modalTitle = document.getElementById('voucher-modal-title');
    const form = document.getElementById('voucher-form');
    const cancelBtn = document.getElementById('cancel-voucher-btn');
    const tableBody = document.getElementById('vouchers-table-body');

    // Form fields
    const voucherIdInput = document.getElementById('voucher-id');
    const voucherNoInput = document.getElementById('voucher-no');
    const voucherDateInput = document.getElementById('voucher-date');
    const movementTypeSelect = document.getElementById('voucher-movement-type');

    const standardFields = document.getElementById('standard-fields');
    const cashboxSelect = document.getElementById('voucher-cashbox');
    const partySelect = document.getElementById('voucher-party');
    const accountSelect = document.getElementById('voucher-account');

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
        populateSelect(cashboxSelect, () => db.cashboxes.toArray(), 'اختر الخزنة');
        populateSelect(fromCashboxSelect, () => db.cashboxes.toArray(), 'اختر الخزنة');
        populateSelect(toCashboxSelect, () => db.cashboxes.toArray(), 'اختر الخزنة');
        populateSelect(partySelect, () => db.parties.toArray(), 'اختر الطرف (اختياري)');
        // Accounts need to be filtered by type based on mode
    };

    const populateAccountsDropdown = async (type) => {
        await populateSelect(accountSelect, () => db.accounts.where('type').equals(type).toArray(), 'اختر الحساب');
    };


    // --- Voucher Number ---
    const generateVoucherNo = async () => {
        const lastVoucher = await db.vouchers.orderBy('id').last();
        const lastNo = lastVoucher ? parseInt(lastVoucher.voucherNo.split('-')[1]) : 0;
        const newNo = (lastNo + 1).toString().padStart(6, '0');
        const year = new Date().getFullYear();
        return `${year}-${newNo}`;
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
    const renderVouchers = async () => {
        try {
            const [vouchers, cashboxes, parties] = await Promise.all([
                db.vouchers.orderBy('date').reverse().toArray(),
                db.cashboxes.toArray(),
                db.parties.toArray()
            ]);

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
                    const lastNo = lastVoucher ? parseInt(lastVoucher.voucherNo.split('-')[1]) : 0;
                    const year = new Date().getFullYear();
                    const voucherNoOut = `${year}-${(lastNo + 1).toString().padStart(6, '0')}`;
                    const voucherNoIn = `${year}-${(lastNo + 2).toString().padStart(6, '0')}`;

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
                        },
                        {
                            voucherNo: voucherNoIn,
                            date: voucherDateInput.value,
                            cashboxId: toId,
                            movementType: 'TransferIn',
                            description: `تحويل من ${fromCashboxText}. ${descriptionInput.value}`,
                            debit: amount, credit: 0, transferId, createdAt: now, updatedAt: now,
                        }
                    ]);
                });
                alert('تم تسجيل عملية التحويل بنجاح.');

            } else { // Receipt or Payment
                const voucherData = {
                    voucherNo: await generateVoucherNo(),
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
                };

                if (!voucherData.cashboxId) return alert('الرجاء اختيار خزنة.');
                if (!voucherData.accountId) return alert('الرجاء اختيار حساب.');
                if (voucherData.debit <= 0 && voucherData.credit <= 0) return alert('يجب إدخال مبلغ.');
                if (voucherData.debit > 0 && voucherData.credit > 0) return alert('لا يمكن إدخال مبلغ في المدين والدائن معًا.');
                if (currentVoucherMode === 'Receipt' && voucherData.debit <= 0) return alert('مبلغ القبض يجب أن يكون أكبر من صفر.');
                if (currentVoucherMode === 'Payment' && voucherData.credit <= 0) return alert('مبلغ الصرف يجب أن يكون أكبر من صفر.');


                await db.vouchers.add(voucherData);
                alert('تم حفظ السند بنجاح.');
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
            renderVouchers();
        }
    });

    tableBody.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('print-btn')) {
            const voucherId = target.dataset.id;
            window.open(`print-voucher.html?id=${voucherId}`, '_blank', 'width=800,height=600');
        }
    });
});
