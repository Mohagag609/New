document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-settlement-vouchers');
    if (!page) return;

    // --- DOM Elements ---
    const addBtn = document.getElementById('add-settlement-voucher-btn');
    const modal = document.getElementById('settlement-voucher-modal');
    const cancelBtn = document.getElementById('cancel-sv-btn');
    const form = document.getElementById('settlement-voucher-form');
    const tableBody = document.getElementById('settlement-vouchers-table-body');

    // Form fields
    const idInput = document.getElementById('settlement-voucher-id');
    const projectSelect = document.getElementById('sv-project-select');
    const dateInput = document.getElementById('sv-date');
    const investorSelect = document.getElementById('sv-investor-select');
    const categorySelect = document.getElementById('sv-category-select');
    const amountInput = document.getElementById('sv-amount');
    const notesInput = document.getElementById('sv-notes');

    const populateSelect = async (selectElement, getItems, nameField = 'name') => {
        const items = await getItems();
        selectElement.innerHTML = `<option value="">اختر...</option>`;
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item[nameField];
            selectElement.appendChild(option);
        });
    };

    const openModal = async (voucher = null) => {
        form.reset();

        // Populate dropdowns
        await Promise.all([
            populateSelect(projectSelect, () => db.projects.toArray()),
            populateSelect(investorSelect, () => db.investors.toArray()),
            populateSelect(categorySelect, () => db.accounts.where({ type: 'Expense' }).toArray())
        ]);

        dateInput.valueAsDate = new Date();

        if (voucher) {
            // Edit logic to be added later
        }

        modal.classList.remove('hidden');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    const renderVouchers = async () => {
        try {
            const currentProjectId = Number(localStorage.getItem('currentProjectId'));
            if (!currentProjectId) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-4">الرجاء اختيار مشروع من القائمة الرئيسية أولاً.</td></tr>`;
                return;
            }

            // This page now shows Payment Vouchers for the current project that have an investor associated with them
            const vouchers = await db.vouchers
                .where({ projectId: currentProjectId })
                .and(v => v.paidByInvestorId != null)
                .reverse()
                .toArray();

            if (vouchers.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-4">لا توجد مصروفات مسجلة على المستثمرين حالياً.</td></tr>`;
                return;
            }

            const projectIds = [...new Set(vouchers.map(v => v.projectId))];
            const investorIds = [...new Set(vouchers.map(v => v.paidByInvestorId))];
            const accountIds = [...new Set(vouchers.map(v => v.accountId))];

            const [projects, investors, accounts] = await Promise.all([
                db.projects.bulkGet(projectIds),
                db.investors.bulkGet(investorIds),
                db.accounts.bulkGet(accountIds)
            ]);

            const projectMap = new Map(projects.filter(p => p).map(p => [p.id, p.name]));
            const investorMap = new Map(investors.filter(i => i).map(i => [i.id, i.name]));
            const accountMap = new Map(accounts.filter(a => a).map(a => [a.id, a.name]));

            tableBody.innerHTML = '';
            vouchers.forEach(v => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-5 py-3">${projectMap.get(v.projectId) || 'N/A'}</td>
                    <td class="px-5 py-3">${v.date}</td>
                    <td class="px-5 py-3">${investorMap.get(v.paidByInvestorId) || 'N/A'}</td>
                    <td class="px-5 py-3">${accountMap.get(v.accountId) || 'N/A'}</td>
                    <td class="px-5 py-3">${formatCurrency(v.credit)}</td>
                    <td class="px-5 py-3">
                        <button class="delete-btn text-red-500" data-id="${v.id}">حذف</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to render vouchers for settlement page:', error);
        }
    };

    const handleFormSubmit = async (event) => {
        event.preventDefault();

        // This form now creates a standard 'Payment' voucher in the main `vouchers` table.
        const voucherData = {
            projectId: Number(projectSelect.value),
            date: dateInput.value,
            paidByInvestorId: Number(investorSelect.value),
            accountId: Number(categorySelect.value),
            credit: Number(amountInput.value), // Payment vouchers use the 'credit' field for the amount
            description: notesInput.value.trim(),
            movementType: 'Payment',
            debit: 0, // Debit is 0 for a payment voucher
            cashboxId: null, // Not specified in this simplified form, can be left null
            partyId: null, // Not specified in this simplified form
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        if (!voucherData.projectId || !voucherData.paidByInvestorId || !voucherData.accountId || !voucherData.credit) {
            alert('الرجاء ملء جميع الحقول المطلوبة.');
            return;
        }

        try {
            await db.transaction('rw', db.vouchers, async () => {
                const lastVoucher = await db.vouchers.orderBy('id').last();
                let lastNo = lastVoucher ? (String(lastVoucher.voucherNo).includes('-') ? parseInt(lastVoucher.voucherNo.split('-')[1], 10) : parseInt(lastVoucher.voucherNo, 10)) : 0;
                voucherData.voucherNo = isNaN(lastNo) ? 1 : lastNo + 1;
                await db.vouchers.add(voucherData);
            });
            alert('تم حفظ مصروف المشروع بنجاح.');
            closeModal();
            renderVouchers();
        } catch (error) {
            console.error('Failed to save voucher:', error);
            alert(`حدث خطأ أثناء حفظ السند: ${error.stack}`);
        }
    };

    addBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);

    tableBody.addEventListener('click', async (e) => {
        if(e.target.classList.contains('delete-btn')) {
            const id = Number(e.target.dataset.id);
            if (confirm('هل أنت متأكد من حذف هذا السند؟')) {
                // Now deleting from the main vouchers table
                await db.vouchers.delete(id);
                renderVouchers();
            }
        }
    });

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-settlement-vouchers') {
            renderVouchers();
        }
    });
});
