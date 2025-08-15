document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-parties');
    if (!page) return;

    const addBtn = document.getElementById('add-party-btn');
    const printBtn = document.getElementById('print-parties-btn');
    const modal = document.getElementById('party-modal');
    const modalTitle = document.getElementById('party-modal-title');
    const cancelBtn = document.getElementById('cancel-party-btn');
    const form = document.getElementById('party-form');
    const tableBody = document.getElementById('parties-table-body');

    const idInput = document.getElementById('party-id');
    const nameInput = document.getElementById('party-name');
    const typeInput = document.getElementById('party-type');
    const phoneInput = document.getElementById('party-phone');
    const notesInput = document.getElementById('party-notes');

    const openModal = (party = null) => {
        form.reset();
        if (party) {
            modalTitle.textContent = 'تعديل طرف';
            idInput.value = party.id;
            nameInput.value = party.name;
            typeInput.value = party.type;
            phoneInput.value = party.phone;
            notesInput.value = party.notes;
        } else {
            modalTitle.textContent = 'إضافة طرف جديد';
            idInput.value = '';
        }
        modal.classList.remove('hidden');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    const renderParties = async () => {
        try {
            const parties = await db.parties.toArray();
            tableBody.innerHTML = '';
            parties.forEach(party => {
                const row = document.createElement('tr');
                const typeText = party.type === 'Customer' ? 'عميل' : 'مورد';
                const status = party.isActive
                    ? `<span class="text-green-600 font-semibold">نشط</span>`
                    : `<span class="text-red-600 font-semibold">معطل</span>`;

                row.innerHTML = `
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${party.name}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${typeText}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${party.phone || ''}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${status}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <button class="edit-btn bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded" data-id="${party.id}">تعديل</button>
                        <button class="toggle-active-btn ${party.isActive ? 'bg-red-500 hover:bg-red-700' : 'bg-green-500 hover:bg-green-700'} text-white font-bold py-1 px-2 rounded" data-id="${party.id}">
                            ${party.isActive ? 'تعطيل' : 'تفعيل'}
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to render parties:', error);
        }
    };

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const id = idInput.value ? Number(idInput.value) : null;
        const partyData = {
            name: nameInput.value.trim(),
            type: typeInput.value,
            phone: phoneInput.value.trim(),
            notes: notesInput.value.trim(),
        };

        try {
            if (id) {
                const existing = await db.parties.get(id);
                await db.parties.put({ ...existing, ...partyData, id });
                alert('تم تحديث الطرف بنجاح.');
            } else {
                await db.parties.add({ ...partyData, isActive: true });
                alert('تمت إضافة الطرف بنجاح.');
            }
            closeModal();
            renderParties();
        } catch (error) {
            console.error('Failed to save party:', error);
            if (error.name === 'ConstraintError') {
                alert('هذا الاسم مستخدم بالفعل لنفس النوع (عميل/مورد).');
            } else {
                alert('حدث خطأ أثناء حفظ الطرف.');
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
            const party = await db.parties.get(id);
            if (party) openModal(party);
        }

        if (target.classList.contains('toggle-active-btn')) {
            const party = await db.parties.get(id);
            if (party) {
                await db.parties.update(id, { isActive: !party.isActive });
                renderParties();
            }
        }
    });

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-parties') {
            renderParties();
        }
    });

    printBtn.addEventListener('click', () => {
        printContent('page-parties', 'قائمة العملاء والموردين');
    });
});
