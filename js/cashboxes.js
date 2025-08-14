document.addEventListener('DOMContentLoaded', () => {
    const cashboxPage = document.getElementById('page-cashboxes');
    if (!cashboxPage) return;

    const addCashboxBtn = document.getElementById('add-cashbox-btn');
    const printBtn = document.getElementById('print-cashboxes-btn');
    const modal = document.getElementById('cashbox-modal');
    const modalTitle = document.getElementById('modal-title');
    const cancelButton = document.getElementById('cancel-btn');
    const cashboxForm = document.getElementById('cashbox-form');
    const cashboxTableBody = document.getElementById('cashboxes-table-body');
    const cashboxTypeSelect = document.getElementById('cashbox-type');
    const parentCashboxContainer = document.getElementById('parent-cashbox-container');
    const parentCashboxSelect = document.getElementById('parent-cashbox-id');
    const cashboxIdInput = document.getElementById('cashbox-id');
    const cashboxNameInput = document.getElementById('cashbox-name');
    const openingBalanceInput = document.getElementById('opening-balance');

    const openModal = (cashbox = null) => {
        cashboxForm.reset();
        parentCashboxContainer.classList.add('hidden');
        populateParentCashboxSelect();

        if (cashbox) {
            modalTitle.textContent = 'تعديل خزنة';
            cashboxIdInput.value = cashbox.id;
            cashboxNameInput.value = cashbox.name;
            cashboxTypeSelect.value = cashbox.type;
            openingBalanceInput.value = cashbox.openingBalance;
            if (cashbox.type === 'Sub') {
                parentCashboxContainer.classList.remove('hidden');
                parentCashboxSelect.value = cashbox.parentId;
            }
        } else {
            modalTitle.textContent = 'إضافة خزنة جديدة';
            cashboxIdInput.value = '';
        }
        modal.classList.remove('hidden');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    const populateParentCashboxSelect = async () => {
        try {
            const mainCashboxes = await db.cashboxes.where('type').equals('Main').toArray();
            parentCashboxSelect.innerHTML = '<option value="">اختر الخزنة الرئيسية</option>';
            mainCashboxes.forEach(cb => {
                const option = document.createElement('option');
                option.value = cb.id;
                option.textContent = cb.name;
                parentCashboxSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Failed to populate parent cashboxes:', error);
        }
    };

    const renderCashboxes = async () => {
        try {
            const allCashboxes = await db.cashboxes.toArray();
            const cashboxNameMap = allCashboxes.reduce((map, cb) => {
                map[cb.id] = cb.name;
                return map;
            }, {});

            cashboxTableBody.innerHTML = '';
            allCashboxes.forEach(cashbox => {
                const row = document.createElement('tr');
                const parentName = cashbox.type === 'Sub' ? cashboxNameMap[cashbox.parentId] || 'N/A' : '-';
                const status = cashbox.isActive ?
                    '<span class="text-green-600 font-semibold">نشطة</span>' :
                    '<span class="text-red-600 font-semibold">معطلة</span>';

                row.innerHTML = `
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${cashbox.name}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${cashbox.type === 'Main' ? 'رئيسية' : 'فرعية'} (${parentName})</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${new Intl.NumberFormat().format(cashbox.openingBalance)}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${status}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <button class="edit-btn bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded" data-id="${cashbox.id}">تعديل</button>
                        <button class="toggle-active-btn ${cashbox.isActive ? 'bg-red-500 hover:bg-red-700' : 'bg-green-500 hover:bg-green-700'} text-white font-bold py-1 px-2 rounded" data-id="${cashbox.id}">
                            ${cashbox.isActive ? 'تعطيل' : 'تفعيل'}
                        </button>
                    </td>
                `;
                cashboxTableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to render cashboxes:', error);
        }
    };

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const id = cashboxIdInput.value ? Number(cashboxIdInput.value) : null;
        const cashboxData = {
            name: cashboxNameInput.value.trim(),
            type: cashboxTypeSelect.value,
            openingBalance: Number(openingBalanceInput.value),
            parentId: cashboxTypeSelect.value === 'Sub' ? Number(parentCashboxSelect.value) : null,
            isActive: true, // Default to active on creation
        };

        if (cashboxData.type === 'Sub' && !cashboxData.parentId) {
            alert('يجب اختيار خزنة رئيسية للخزنة الفرعية.');
            return;
        }

        try {
            if (id) {
                // Update
                const existing = await db.cashboxes.get(id);
                await db.cashboxes.put({ ...existing, ...cashboxData, id });
                alert('تم تحديث الخزنة بنجاح.');
            } else {
                // Create
                await db.cashboxes.add(cashboxData);
                alert('تمت إضافة الخزنة بنجاح.');
            }
            closeModal();
            renderCashboxes();
        } catch (error) {
            console.error('Failed to save cashbox:', error);
            if (error.name === 'ConstraintError') {
                alert('اسم الخزنة موجود بالفعل. الرجاء اختيار اسم آخر.');
            } else {
                alert('حدث خطأ أثناء حفظ الخزنة.');
            }
        }
    };

    // Event Listeners
    addCashboxBtn.addEventListener('click', () => openModal());
    cancelButton.addEventListener('click', closeModal);
    cashboxForm.addEventListener('submit', handleFormSubmit);

    cashboxTypeSelect.addEventListener('change', () => {
        if (cashboxTypeSelect.value === 'Sub') {
            parentCashboxContainer.classList.remove('hidden');
        } else {
            parentCashboxContainer.classList.add('hidden');
        }
    });

    cashboxTableBody.addEventListener('click', async (event) => {
        const target = event.target;
        const id = Number(target.dataset.id);

        if (target.classList.contains('edit-btn')) {
            const cashbox = await db.cashboxes.get(id);
            if (cashbox) openModal(cashbox);
        }

        if (target.classList.contains('toggle-active-btn')) {
            // For now, we will just toggle the status.
            // In the future, we need to check if there are vouchers associated.
            const cashbox = await db.cashboxes.get(id);
            if(cashbox) {
                // A real app should ask for confirmation
                await db.cashboxes.update(id, { isActive: !cashbox.isActive });
                renderCashboxes();
            }
        }
    });

    // Listen for page show events
    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-cashboxes') {
            renderCashboxes();
        }
    });

    printBtn.addEventListener('click', () => {
        cashboxPage.classList.add('printing');
        window.onafterprint = () => {
            cashboxPage.classList.remove('printing');
        };
        window.print();
    });
});
