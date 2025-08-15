document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-accounts');
    if (!page) return;

    const addBtn = document.getElementById('add-account-btn');
    const printBtn = document.getElementById('print-accounts-btn');
    const modal = document.getElementById('account-modal');
    const modalTitle = document.getElementById('account-modal-title');
    const cancelBtn = document.getElementById('cancel-account-btn');
    const form = document.getElementById('account-form');
    const tableBody = document.getElementById('accounts-table-body');

    const idInput = document.getElementById('account-id');
    const nameInput = document.getElementById('account-name');
    const typeInput = document.getElementById('account-type');

    const openModal = (account = null) => {
        form.reset();
        if (account) {
            modalTitle.textContent = 'تعديل حساب';
            idInput.value = account.id;
            nameInput.value = account.name;
            typeInput.value = account.type;
        } else {
            modalTitle.textContent = 'إضافة حساب جديد';
            idInput.value = '';
        }
        modal.classList.remove('hidden');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    const renderAccounts = async () => {
        try {
            const accounts = await db.accounts.toArray();
            tableBody.innerHTML = '';
            accounts.forEach(account => {
                const row = document.createElement('tr');
                const typeText = account.type === 'Expense' ? 'مصروف' : 'إيراد';
                const status = account.isActive
                    ? `<span class="text-green-600 font-semibold">نشط</span>`
                    : `<span class="text-red-600 font-semibold">معطل</span>`;

                row.innerHTML = `
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${account.name}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${typeText}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${status}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <button class="edit-btn bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded" data-id="${account.id}">تعديل</button>
                        <button class="toggle-active-btn ${account.isActive ? 'bg-red-500 hover:bg-red-700' : 'bg-green-500 hover:bg-green-700'} text-white font-bold py-1 px-2 rounded" data-id="${account.id}">
                            ${account.isActive ? 'تعطيل' : 'تفعيل'}
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to render accounts:', error);
        }
    };

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const id = idInput.value ? Number(idInput.value) : null;
        const accountData = {
            name: nameInput.value.trim(),
            type: typeInput.value,
        };

        try {
            if (id) {
                const existing = await db.accounts.get(id);
                await db.accounts.put({ ...existing, ...accountData, id });
                alert('تم تحديث الحساب بنجاح.');
            } else {
                await db.accounts.add({ ...accountData, isActive: true });
                alert('تمت إضافة الحساب بنجاح.');
            }
            closeModal();
            renderAccounts();
        } catch (error) {
            console.error('Failed to save account:', error);
            if (error.name === 'ConstraintError') {
                alert('هذا الاسم مستخدم بالفعل لنفس النوع (مصروف/إيراد).');
            } else {
                alert('حدث خطأ أثناء حفظ الحساب.');
            }
        }
    };

    addBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);

    tableBody.addEventListener('click', async (event) => {
        const target = event.target;
        const id = Number(target.dataset.id);

        if (target.classList.contains('edit-btn')) {
            const account = await db.accounts.get(id);
            if (account) openModal(account);
        }

        if (target.classList.contains('toggle-active-btn')) {
            const account = await db.accounts.get(id);
            if (account) {
                await db.accounts.update(id, { isActive: !account.isActive });
                renderAccounts();
            }
        }
    });

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-accounts') {
            renderAccounts();
        }
    });

    printBtn.addEventListener('click', () => {
        printContent('page-accounts', 'قائمة أنواع الحسابات');
    });
});
