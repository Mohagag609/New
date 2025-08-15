document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-investors');
    if (!page) return;

    // --- DOM Elements ---
    const addBtn = document.getElementById('add-investor-btn');
    const modal = document.getElementById('investor-modal');
    const modalTitle = document.getElementById('investor-modal-title');
    const cancelBtn = document.getElementById('cancel-investor-btn');
    const form = document.getElementById('investor-form');
    const tableBody = document.getElementById('investors-table-body');

    const idInput = document.getElementById('investor-id');
    const nameInput = document.getElementById('investor-name');

    const openModal = (investor = null) => {
        form.reset();
        if (investor) {
            modalTitle.textContent = 'تعديل مستثمر';
            idInput.value = investor.id;
            nameInput.value = investor.name;
        } else {
            modalTitle.textContent = 'إضافة مستثمر جديد';
            idInput.value = '';
        }
        modal.classList.remove('hidden');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    const renderInvestors = async () => {
        try {
            const investors = await settlementDb.investors.toArray();
            tableBody.innerHTML = '';
            investors.forEach(inv => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${inv.name}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <button class="edit-btn bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded" data-id="${inv.id}">تعديل</button>
                        <button class="delete-btn bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded" data-id="${inv.id}">حذف</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to render investors:', error);
        }
    };

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const id = idInput.value ? Number(idInput.value) : null;
        const investorData = {
            name: nameInput.value.trim(),
        };

        if (!investorData.name) {
            alert('اسم المستثمر مطلوب.');
            return;
        }

        try {
            if (id) {
                await settlementDb.investors.put({ ...investorData, id });
                alert('تم تحديث المستثمر بنجاح.');
            } else {
                await settlementDb.investors.add(investorData);
                alert('تمت إضافة المستثمر بنجاح.');
            }
            closeModal();
            renderInvestors();
        } catch (error) {
            console.error('Failed to save investor:', error);
            if (error.name === 'ConstraintError') {
                alert('اسم المستثمر موجود بالفعل.');
            } else {
                alert('حدث خطأ أثناء حفظ المستثمر.');
            }
        }
    };

    const handleDelete = async (id) => {
        // A real app should check for links to projects before deleting.
        if (!confirm('هل أنت متأكد أنك تريد حذف هذا المستثمر؟')) {
            return;
        }
        try {
            await settlementDb.investors.delete(id);
            alert('تم حذف المستثمر.');
            renderInvestors();
        } catch (error) {
            console.error('Failed to delete investor:', error);
        }
    };

    addBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);

    tableBody.addEventListener('click', async (event) => {
        const target = event.target;
        const id = Number(target.dataset.id);

        if (target.classList.contains('edit-btn')) {
            const investor = await settlementDb.investors.get(id);
            if (investor) openModal(investor);
        }

        if (target.classList.contains('delete-btn')) {
            handleDelete(id);
        }
    });

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-investors') {
            renderInvestors();
        }
    });
});
