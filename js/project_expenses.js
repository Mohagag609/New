document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-project-expenses');
    if (!page) return;

    // --- DOM Elements ---
    const addExpenseBtn = document.getElementById('add-project-expense-btn');
    const modal = document.getElementById('project-expense-modal');
    const cancelBtn = document.getElementById('cancel-pe-btn');
    const form = document.getElementById('project-expense-form');
    const tableBody = document.getElementById('project-expenses-table-body');

    // Form fields
    const idInput = document.getElementById('project-expense-id');
    const projectSelect = document.getElementById('pe-project-select');
    const dateInput = document.getElementById('pe-date');
    const investorSelect = document.getElementById('pe-investor-select');
    const accountSelect = document.getElementById('pe-account-select');
    const amountInput = document.getElementById('pe-amount');
    const notesInput = document.getElementById('pe-notes');

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

    const openModal = async () => {
        form.reset();

        await Promise.all([
            populateSelect(projectSelect, () => db.projects.toArray()),
            populateSelect(investorSelect, () => db.investors.toArray()),
            populateSelect(accountSelect, () => db.accounts.where({ type: 'Expense' }).toArray())
        ]);

        dateInput.valueAsDate = new Date();
        modal.classList.remove('hidden');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    const renderVouchers = async () => {
        try {
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
            voucherNo: `PROJ-EXP-${Date.now()}`,
            projectId: Number(projectSelect.value),
            date: dateInput.value,
            paidByInvestorId: Number(investorSelect.value),
            accountId: Number(accountSelect.value),
            debit: Number(amountInput.value),
            credit: 0,
            description: notesInput.value.trim(),
            movementType: 'Project Expense',
            cashboxId: 0,
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

    addExpenseBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);

    tableBody.addEventListener('click', async (e) => {
        if(e.target.classList.contains('delete-btn')) {
            const id = Number(e.target.dataset.id);
            if (confirm('هل أنت متأكد من حذف هذا السند؟')) {
                await db.vouchers.delete(id);
                renderVouchers();
            }
        }
    });

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-project-expenses') {
            renderVouchers();
        }
    });
});
