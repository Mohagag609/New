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
        // Cashboxes and Parties are now global, so we don't filter by projectId.
        populateSelect(cashboxSelect, () => db.cashboxes.toArray(), 'اختر الخزنة');
        populateSelect(fromCashboxSelect, () => db.cashboxes.toArray(), 'اختر الخزنة');
        populateSelect(toCashboxSelect, () => db.cashboxes.toArray(), 'اختر الخزنة');
        populateSelect(partySelect, () => db.parties.toArray(), 'اختر الطرف (اختياري)');
    };

    const populateAccountsDropdown = async (type) => {
        await populateSelect(accountSelect, () => db.accounts.where({ type: type, projectId: currentProjectId }).toArray(), 'اختر الحساب');
    };

    const populateInvestorsDropdown = async () => {
        const settlementProjectId = Number(localStorage.getItem('currentSettlementProjectId'));
        if (!settlementProjectId) {
            onBehalfInvestorSelect.innerHTML = '<option value="">الرجاء تحديد مشروع أولاً</option>';
            onBehalfInvestorSelect.disabled = true;
            return;
        };

        const links = await db.project_investors.where({ projectId: settlementProjectId }).toArray();
        onBehalfInvestorSelect.disabled = false;

        if (links.length === 0) {
            onBehalfInvestorSelect.innerHTML = '<option value="">لا يوجد مستثمرون مرتبطون بهذا المشروع</option>';
            onBehalfInvestorSelect.disabled = true;
        } else {
            const investorIds = links.map(link => link.investorId);
            const investors = await db.investors.where('id').anyOf(investorIds).toArray();

            onBehalfInvestorSelect.innerHTML = '<option value="">اختر المستثمر (اختياري)</option>';
            investors.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.name;
                onBehalfInvestorSelect.appendChild(option);
            });
        }
    };

    const configureFormForMode = async (mode) => {
        currentVoucherMode = mode;
        standardFields.classList.remove('hidden');
        transferFields.classList.add('hidden');
        debitInput.parentElement.classList.remove('hidden');
        creditInput.parentElement.classList.remove('hidden');
        accountSelect.parentElement.classList.remove('hidden');
        partySelect.parentElement.classList.remove('hidden');
        onBehalfInvestorContainer.classList.add('hidden');

        debitInput.disabled = false;
        creditInput.disabled = false;

        let title = '';
        switch (mode) {
            case 'Receipt':
                title = 'إنشاء سند قبض';
                creditInput.value = 0;
                creditInput.disabled = true;
                populateAccountsDropdown('Revenue');
                break;
            case 'Payment':
                title = 'إنشاء سند صرف';
                debitInput.value = 0;
                debitInput.disabled = true;
                populateAccountsDropdown('Expense');
                populateInvestorsDropdown();
                onBehalfInvestorContainer.classList.remove('hidden');
                break;
            case 'Transfer':
                title = 'إنشاء تحويل مالي';
                standardFields.classList.add('hidden');
                transferFields.classList.remove('hidden');
                creditInput.parentElement.classList.add('hidden');
                debitInput.previousElementSibling.textContent = 'المبلغ';
                break;
        }

        if (mode === 'Receipt' || mode === 'Payment') {
            const projectId = Number(localStorage.getItem('currentProjectId'));
            if (projectId) {
                try {
                    const project = await db.projects.get(projectId);
                    if (project) {
                        title += ` (مشروع: ${project.name})`;
                    }
                } catch (error) {
                    console.error("Could not fetch project name for modal title", error);
                }
            }
        }
        modalTitle.textContent = title;
    };

    const openModal = async (mode, voucher = null) => {
        form.reset();
        movementTypeSelect.innerHTML = `
            <option value="Receipt">سند قبض</option>
            <option value="Payment">سند صرف</option>
            <option value="Transfer">تحويل</option>
        `;
        movementTypeSelect.value = mode;
        voucherDateInput.valueAsDate = new Date();
        populateAllDropdowns();

        if (voucher) {
            modalTitle.textContent = 'تعديل سند';
        } else {
            voucherNoInput.value = '';
            voucherNoInput.placeholder = 'سيتم إنشاؤه تلقائيًا';
            await configureFormForMode(mode);
        }
        modal.classList.remove('hidden');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    const renderVouchers = async (filters = {}) => {
        try {
            let allVouchers = await db.vouchers.where({ projectId: currentProjectId }).reverse().toArray();

            if (filters.fromDate && filters.toDate) {
                allVouchers = allVouchers.filter(v => v.date >= filters.fromDate && v.date <= filters.toDate);
            }

            const [cashboxes, parties] = await Promise.all([
                db.cashboxes.toArray(),
                db.parties.toArray()
            ]);
            const cashboxMap = new Map(cashboxes.map(c => [c.id, c.name]));

            if (allVouchers.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="8" class="text-center p-4">لا توجد سندات لعرضها حاليًا.</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            allVouchers.forEach(v => {
                const row = document.createElement('tr');
                const movementTypeText = {
                    'Receipt': 'قبض', 'Payment': 'صرف',
                    'TransferIn': 'تحويل وارد', 'TransferOut': 'تحويل صادر'
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

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const now = new Date().toISOString();

        try {
            if (currentVoucherMode === 'Transfer') {
                // ... (transfer logic remains the same, it only uses db.vouchers)
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

                if (!voucherData.cashboxId || !voucherData.accountId) return alert('Please select a cashbox and account.');
                // ... (other validations)

                const onBehalfInvestorId = Number(onBehalfInvestorSelect.value);

                if (currentVoucherMode === 'Payment' && onBehalfInvestorId) {
                    const settlementProjectId = Number(localStorage.getItem('currentSettlementProjectId'));
                    if (!settlementProjectId) return alert('Error: No settlement project selected.');

                    const allTableNames = [
                        'cashboxes', 'parties', 'accounts', 'vouchers',
                        'projects', 'investors', 'project_investors',
                        'settlement_vouchers', 'expense_categories', 'adjustments'
                    ];
                    await db.transaction('rw', allTableNames, async () => {
                        const lastVoucher = await db.vouchers.orderBy('id').last();
                        let lastNo = lastVoucher ? (String(lastVoucher.voucherNo).includes('-') ? parseInt(lastVoucher.voucherNo.split('-')[1], 10) : parseInt(lastVoucher.voucherNo, 10)) : 0;
                        voucherData.voucherNo = isNaN(lastNo) ? 1 : lastNo + 1;
                        voucherData.description = `(مصروف تسوية) ${voucherData.description}`;
                        const treasuryVoucherId = await db.vouchers.add(voucherData);

                        const settlementVoucherData = {
                            projectId: settlementProjectId,
                            date: voucherData.date,
                            categoryId: voucherData.accountId,
                            partyId: voucherData.partyId, // <-- Add partyId
                            amount: voucherData.credit,
                            paidByInvestorId: onBehalfInvestorId,
                            description: `(من الخزينة) ${voucherData.description}`,
                            treasuryVoucherId: treasuryVoucherId,
                            createdAt: now,
                            updatedAt: now
                        };
                        await db.settlement_vouchers.add(settlementVoucherData);
                    });
                    alert('تم حفظ سند الصرف ومصروف التسوية بنجاح.');
                } else {
                    await db.transaction('rw', db.vouchers, async () => {
                        const lastVoucher = await db.vouchers.orderBy('id').last();
                        let lastNo = lastVoucher ? (String(lastVoucher.voucherNo).includes('-') ? parseInt(lastVoucher.voucherNo.split('-')[1], 10) : parseInt(lastVoucher.voucherNo, 10)) : 0;
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
            alert(`حدث خطأ أثناء حفظ السند: ${error.stack}`);
        }
    };

    form.addEventListener('submit', handleFormSubmit);
    newReceiptBtn.addEventListener('click', () => openModal('Receipt'));
    newPaymentBtn.addEventListener('click', () => openModal('Payment'));
    newTransferBtn.addEventListener('click', () => openModal('Transfer'));
    cancelBtn.addEventListener('click', closeModal);
    filterBtn.addEventListener('click', () => {
        const fromDate = filterFromDate.value;
        const toDate = filterToDate.value;
        if (fromDate && toDate) renderVouchers({ fromDate, toDate });
    });
    tableBody.addEventListener('click', (event) => {
        if (event.target.classList.contains('print-btn')) {
            window.open(`print-voucher.html?id=${event.target.dataset.id}`, '_blank', 'width=800,height=600');
        }
    });
    movementTypeSelect.addEventListener('change', (e) => configureFormForMode(e.target.value));
    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-vouchers') {
            filterFromDate.value = '';
            filterToDate.value = '';
            renderVouchers();
        }
    });
});
