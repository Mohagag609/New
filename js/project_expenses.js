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
            // Fetch vouchers that are project-related expenses paid by investors
            const vouchers = await db.vouchers.where('paidByInvestorId').above(0).reverse().toArray();

            if (vouchers.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-4">لا توجد سندات حالياً.</td></tr>`;
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
            const accountMap = new Map(accounts.filter(c => c).map(c => [c.id, c.name]));

            tableBody.innerHTML = '';
            vouchers.forEach(v => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-5 py-3">${projectMap.get(v.projectId) || ''}</td>
                    <td class="px-5 py-3">${v.date}</td>
                    <td class="px-5 py-3">${investorMap.get(v.paidByInvestorId) || ''}</td>
                    <td class="px-5 py-3">${accountMap.get(v.accountId) || ''}</td>
                    <td class="px-5 py-3">${v.debit}</td>
                    <td class="px-5 py-3">
                        <button class="delete-btn text-red-500" data-id="${v.id}">حذف</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to render project expenses:', error);
        }
    };

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const voucherData = {
            projectId: Number(projectSelect.value),
            date: dateInput.value,
            paidByInvestorId: Number(investorSelect.value),
            accountId: Number(categorySelect.value),
            debit: Number(amountInput.value),
            credit: 0,
            description: notesInput.value.trim(),
            movementType: 'Payment', // All project expenses are payments from an investor's perspective
            cashboxId: 0, // No cashbox involved in this type of transaction
        };

        if (!voucherData.projectId || !voucherData.paidByInvestorId || !voucherData.accountId || !voucherData.debit) {
            alert('الرجاء ملء جميع الحقول المطلوبة.');
            return;
        }

        try {
            await db.vouchers.add(voucherData);
            alert('تم حفظ سند الصرف بنجاح.');
            closeModal();
            renderVouchers();
        } catch (error) {
            console.error('Failed to save project expense voucher:', error);
            alert('حدث خطأ أثناء حفظ السند.');
        }
    };

    addBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);

    tableBody.addEventListener('click', async (e) => {
        if(e.target.classList.contains('delete-btn')) {
            const id = Number(e.target.dataset.id);
            if (confirm('هل أنت متأكد من حذف هذا السند؟')) {
                await db.settlement_vouchers.delete(id);
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
