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
            populateSelect(projectSelect, () => settlementDb.projects.toArray()),
            populateSelect(investorSelect, () => settlementDb.investors.toArray()),
            populateSelect(categorySelect, () => settlementDb.expense_categories.toArray())
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
            const vouchers = await settlementDb.settlement_vouchers.orderBy('id').reverse().toArray();
            if (vouchers.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="6" class="text-center p-4">لا توجد سندات حالياً.</td></tr>`;
                return;
            }

            // Gather all unique IDs needed for lookups
            const projectIds = [...new Set(vouchers.map(v => v.projectId))];
            const investorIds = [...new Set(vouchers.map(v => v.paidByInvestorId))];
            const categoryIds = [...new Set(vouchers.map(v => v.categoryId))];

            // Fetch all lookup data in one go
            const [projects, investors, categories] = await Promise.all([
                settlementDb.projects.bulkGet(projectIds),
                settlementDb.investors.bulkGet(investorIds),
                settlementDb.expense_categories.bulkGet(categoryIds)
            ]);

            // Create maps for efficient lookup
            const projectMap = new Map(projects.filter(p => p).map(p => [p.id, p.name]));
            const investorMap = new Map(investors.filter(i => i).map(i => [i.id, i.name]));
            const categoryMap = new Map(categories.filter(c => c).map(c => [c.id, c.name]));

            tableBody.innerHTML = '';
            vouchers.forEach(v => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-5 py-3">${projectMap.get(v.projectId) || ''}</td>
                    <td class="px-5 py-3">${v.date}</td>
                    <td class="px-5 py-3">${investorMap.get(v.paidByInvestorId) || ''}</td>
                    <td class="px-5 py-3">${categoryMap.get(v.categoryId) || ''}</td>
                    <td class="px-5 py-3">${v.amount}</td>
                    <td class="px-5 py-3">
                        <button class="delete-btn text-red-500" data-id="${v.id}">حذف</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to render settlement vouchers:', error);
        }
    };

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const voucherData = {
            projectId: Number(projectSelect.value),
            date: dateInput.value,
            paidByInvestorId: Number(investorSelect.value),
            categoryId: Number(categorySelect.value),
            amount: Number(amountInput.value),
            notes: notesInput.value.trim(),
            type: 'Payment', // As per spec, all entries here are expenses
        };

        if (!voucherData.projectId || !voucherData.paidByInvestorId || !voucherData.categoryId || !voucherData.amount) {
            alert('الرجاء ملء جميع الحقول المطلوبة.');
            return;
        }

        try {
            await settlementDb.settlement_vouchers.add(voucherData);
            alert('تم حفظ سند الصرف بنجاح.');
            closeModal();
            renderVouchers();
        } catch (error) {
            console.error('Failed to save settlement voucher:', error);
        }
    };

    addBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);

    tableBody.addEventListener('click', async (e) => {
        if(e.target.classList.contains('delete-btn')) {
            const id = Number(e.target.dataset.id);
            if (confirm('هل أنت متأكد من حذف هذا السند؟')) {
                await settlementDb.settlement_vouchers.delete(id);
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
