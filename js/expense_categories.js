document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-expense-categories');
    if (!page) return;

    // --- DOM Elements ---
    const addBtn = document.getElementById('add-exp-category-btn');
    const modal = document.getElementById('exp-category-modal');
    const modalTitle = document.getElementById('exp-category-modal-title');
    const cancelBtn = document.getElementById('cancel-exp-category-btn');
    const form = document.getElementById('exp-category-form');
    const tableBody = document.getElementById('exp-categories-table-body');

    const idInput = document.getElementById('exp-category-id');
    const nameInput = document.getElementById('exp-category-name');

    const openModal = (category = null) => {
        form.reset();
        if (category) {
            modalTitle.textContent = 'تعديل تصنيف';
            idInput.value = category.id;
            nameInput.value = category.name;
        } else {
            modalTitle.textContent = 'إضافة تصنيف جديد';
            idInput.value = '';
        }
        modal.classList.remove('hidden');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    const renderCategories = async () => {
        try {
            const categories = await db.expense_categories.toArray();
            tableBody.innerHTML = '';
            categories.forEach(cat => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${cat.name}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <button class="edit-btn bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded" data-id="${cat.id}">تعديل</button>
                        <button class="delete-btn bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded" data-id="${cat.id}">حذف</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to render expense categories:', error);
        }
    };

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const id = idInput.value ? Number(idInput.value) : null;
        const categoryData = {
            name: nameInput.value.trim(),
        };

        if (!categoryData.name) {
            alert('اسم التصنيف مطلوب.');
            return;
        }

        try {
            if (id) {
                await db.expense_categories.put({ ...categoryData, id });
                alert('تم تحديث التصنيف بنجاح.');
            } else {
                await db.expense_categories.add(categoryData);
                alert('تمت إضافة التصنيف بنجاح.');
            }
            closeModal();
            renderCategories();
        } catch (error) {
            console.error('Failed to save expense category:', error);
            if (error.name === 'ConstraintError') {
                alert('اسم التصنيف موجود بالفعل.');
            } else {
                alert('حدث خطأ أثناء حفظ التصنيف.');
            }
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('هل أنت متأكد أنك تريد حذف هذا التصنيف؟')) {
            return;
        }
        try {
            // A real app should check if this category is used in any vouchers first.
            await db.expense_categories.delete(id);
            alert('تم حذف التصنيف.');
            renderCategories();
        } catch (error) {
            console.error('Failed to delete expense category:', error);
        }
    };

    addBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);

    tableBody.addEventListener('click', async (event) => {
        const target = event.target;
        const id = Number(target.dataset.id);

        if (target.classList.contains('edit-btn')) {
            const category = await db.expense_categories.get(id);
            if (category) openModal(category);
        }

        if (target.classList.contains('delete-btn')) {
            handleDelete(id);
        }
    });

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-expense-categories') {
            renderCategories();
        }
    });
});
