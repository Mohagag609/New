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
            const investors = await db.investors.toArray();
            tableBody.innerHTML = '';
            investors.forEach(inv => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${inv.name}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <button class="details-btn bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded" data-id="${inv.id}">التفاصيل</button>
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
                await db.investors.put({ ...investorData, id });
                alert('تم تحديث المستثمر بنجاح.');
            } else {
                await db.investors.add(investorData);
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
            await db.investors.delete(id);
            alert('تم حذف المستثمر.');
            renderInvestors();
        } catch (error) {
            console.error('Failed to delete investor:', error);
        }
    };

    addBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);

    // Details Modal Logic
    const detailsModal = document.getElementById('investor-details-modal');
    const openDetailsModal = async (investorId) => {
        if (!detailsModal) return;
        const investor = await db.investors.get(investorId);
        if (!investor) return;

        const detailsModalTitle = document.getElementById('investor-details-modal-title');
        const detailsModalBody = document.getElementById('investor-details-modal-body');

        detailsModalTitle.textContent = `تفاصيل مستثمر: ${investor.name}`;

        const ratios = await db.settlementRatios.where({ investorId }).toArray();
        const projectIds = ratios.map(r => r.projectId);
        const projects = await db.projects.where('id').anyOf(projectIds).toArray();
        const projectsById = projects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

        detailsModalBody.innerHTML = '';
        if (ratios.length > 0) {
            const list = document.createElement('ul');
            list.className = 'list-disc space-y-2 pl-5';
            ratios.forEach(ratio => {
                const project = projectsById[ratio.projectId];
                if(project) {
                    const listItem = document.createElement('li');
                    listItem.textContent = `مشروع: ${project.name} - نسبة: ${ratio.ratio * 100}%`;
                    list.appendChild(listItem);
                }
            });
            detailsModalBody.appendChild(list);
        } else {
            detailsModalBody.textContent = 'لا توجد مشاريع مرتبطة بهذا المستثمر.';
        }
        detailsModal.classList.remove('hidden');
    };

    const closeDetailsModal = () => {
        if (detailsModal) detailsModal.classList.add('hidden');
    };

    const detailsCancelBtn = document.getElementById('cancel-investor-details-btn');
    if (detailsCancelBtn) {
        detailsCancelBtn.addEventListener('click', closeDetailsModal);
    }

    // Combined Event Listener for Table Body
    tableBody.addEventListener('click', async (event) => {
        const target = event.target;
        if (!target.dataset.id) return;
        const id = Number(target.dataset.id);

        if (target.classList.contains('edit-btn')) {
            const investor = await db.investors.get(id);
            if (investor) openModal(investor);
        } else if (target.classList.contains('delete-btn')) {
            handleDelete(id);
        } else if (target.classList.contains('details-btn')) {
            openDetailsModal(id);
        }
    });

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-investors') {
            renderInvestors();
        }
    });
});
