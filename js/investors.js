document.addEventListener('DOMContentLoaded', () => {
    let isInitialized = false;

    // --- DOM Element Getters ---
    // We call these getters inside functions to ensure the DOM is ready
    const getElements = () => ({
        addBtn: document.getElementById('add-investor-btn'),
        modal: document.getElementById('investor-modal'),
        modalTitle: document.getElementById('investor-modal-title'),
        cancelBtn: document.getElementById('cancel-investor-btn'),
        form: document.getElementById('investor-form'),
        tableBody: document.getElementById('investors-table-body'),
        idInput: document.getElementById('investor-id'),
        nameInput: document.getElementById('investor-name'),
        detailsModal: document.getElementById('investor-details-modal'),
        detailsModalTitle: document.getElementById('investor-details-modal-title'),
        detailsModalBody: document.getElementById('investor-details-modal-body'),
        detailsCancelBtn: document.getElementById('cancel-investor-details-btn'),
    });

    // --- Core Functions ---
    const renderInvestors = async () => {
        const { tableBody } = getElements();
        if (!tableBody) return;
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

    const openDetailsModal = async (investor) => {
        const { detailsModal, detailsModalTitle, detailsModalBody } = getElements();
        if (!detailsModal || !detailsModalTitle || !detailsModalBody) return;

        detailsModalTitle.textContent = `تفاصيل مستثمر: ${investor.name}`;
        try {
            const ratios = await db.settlementRatios.where({ investorId: investor.id }).toArray();
            const projectIds = ratios.map(r => r.projectId);
            const projects = await db.projects.where('id').anyOf(projectIds).toArray();
            const projectsById = projects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

            detailsModalBody.innerHTML = '';
            if (ratios.length > 0) {
                const list = document.createElement('ul');
                list.className = 'list-disc space-y-2 pl-5';
                ratios.forEach(ratio => {
                    const project = projectsById[ratio.projectId];
                    if (project) {
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
        } catch (error) {
            console.error('Failed to open details modal:', error);
        }
    };

    const closeDetailsModal = () => {
        const { detailsModal } = getElements();
        if (detailsModal) detailsModal.classList.add('hidden');
    };

    const openModal = (investor = null) => {
        const { form, modal, modalTitle, idInput, nameInput } = getElements();
        if (!form || !modal || !modalTitle || !idInput || !nameInput) return;

        form.reset();
        modalTitle.textContent = investor ? 'تعديل مستثمر' : 'إضافة مستثمر جديد';
        idInput.value = investor ? investor.id : '';
        nameInput.value = investor ? investor.name : '';
        modal.classList.remove('hidden');
    };

    const closeModal = () => {
        const { modal } = getElements();
        if (modal) modal.classList.add('hidden');
    };

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const { idInput, nameInput } = getElements();
        if (!idInput || !nameInput) return;

        const id = idInput.value ? Number(idInput.value) : null;
        const investorData = { name: nameInput.value.trim() };
        if (!investorData.name) return alert('اسم المستثمر مطلوب.');

        try {
            if (id) {
                await db.investors.put({ ...investorData, id });
                alert('تم تحديث المستثمر بنجاح.');
            } else {
                await db.investors.add(investorData);
                alert('تمت إضافة المستثمر بنجاح.');
            }
            closeModal();
            await renderInvestors();
        } catch (error) {
            console.error('Failed to save investor:', error);
            alert(error.name === 'ConstraintError' ? 'اسم المستثمر موجود بالفعل.' : 'حدث خطأ أثناء حفظ المستثمر.');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('هل أنت متأكد أنك تريد حذف هذا المستثمر؟')) return;
        try {
            await db.investors.delete(id);
            alert('تم حذف المستثمر.');
            await renderInvestors();
        } catch (error) {
            console.error('Failed to delete investor:', error);
        }
    };

    const handleTableClick = async (event) => {
        const target = event.target;
        if (!target.dataset.id) return;
        const id = Number(target.dataset.id);

        if (target.classList.contains('edit-btn')) {
            const investor = await db.investors.get(id);
            if (investor) openModal(investor);
        } else if (target.classList.contains('delete-btn')) {
            handleDelete(id);
        } else if (target.classList.contains('details-btn')) {
            const investor = await db.investors.get(id);
            if (investor) openDetailsModal(investor);
        }
    };

    // --- Initializer ---
    const init = () => {
        const { addBtn, cancelBtn, detailsCancelBtn, form, tableBody } = getElements();
        if (!addBtn || !cancelBtn || !detailsCancelBtn || !form || !tableBody) {
            console.error("Failed to initialize investors page: one or more elements are missing.");
            return;
        }

        addBtn.addEventListener('click', () => openModal());
        cancelBtn.addEventListener('click', closeModal);
        detailsCancelBtn.addEventListener('click', closeDetailsModal);
        form.addEventListener('submit', handleFormSubmit);
        tableBody.addEventListener('click', handleTableClick);

        isInitialized = true;
    };

    // --- Page Load Event ---
    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-investors') {
            if (!isInitialized) {
                init();
            }
            renderInvestors();
        }
    });
});
