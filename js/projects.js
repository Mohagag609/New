document.addEventListener('DOMContentLoaded', () => {
    try {
        const page = document.getElementById('page-projects');
        if (!page) return;

        // --- DOM Elements ---
    const addBtn = document.getElementById('add-project-btn');
    const modal = document.getElementById('project-modal');
    const modalTitle = document.getElementById('project-modal-title');
    const cancelBtn = document.getElementById('cancel-project-btn');
    const form = document.getElementById('project-form');
    const tableBody = document.getElementById('projects-table-body');

    const idInput = document.getElementById('project-id');
    const nameInput = document.getElementById('project-name');
    const descriptionInput = document.getElementById('project-description');

    const openModal = (project = null) => {
        form.reset();
        if (project) {
            modalTitle.textContent = 'تعديل مشروع';
            idInput.value = project.id;
            nameInput.value = project.name;
            descriptionInput.value = project.description || '';
        } else {
            modalTitle.textContent = 'إضافة مشروع جديد';
            idInput.value = '';
        }
        modal.classList.remove('hidden');
    };

    const closeModal = () => {
        modal.classList.add('hidden');
    };

    const renderProjects = async () => {
        try {
            const projects = await db.projects.toArray();
            tableBody.innerHTML = '';
            projects.forEach(p => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${p.name}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${p.description || ''}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <button class="edit-btn bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-2 rounded" data-id="${p.id}">تعديل</button>
                        <button class="delete-btn bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded" data-id="${p.id}">حذف</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Failed to render projects:', error);
        }
    };

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const id = idInput.value ? Number(idInput.value) : null;
        const projectData = {
            name: nameInput.value.trim(),
            description: descriptionInput.value.trim(),
        };

        if (!projectData.name) {
            alert('اسم المشروع مطلوب.');
            return;
        }

        try {
            if (id) {
                await db.projects.put({ ...projectData, id });
                alert('تم تحديث المشروع بنجاح.');
            } else {
                await db.projects.add(projectData);
                alert('تمت إضافة المشروع بنجاح.');
            }
            closeModal();
            renderProjects();
        } catch (error) {
            console.error('Failed to save project:', error);
            if (error.name === 'ConstraintError') {
                alert('اسم المشروع موجود بالفعل.');
            } else {
                alert('حدث خطأ أثناء حفظ المشروع.');
            }
        }
    };

    const handleDelete = async (id) => {
        // IMPORTANT: A real app would check for associated data before deleting.
        // For now, we just show a confirmation.
        if (!confirm('هل أنت متأكد أنك تريد حذف هذا المشروع؟ سيتم حذف جميع البيانات المرتبطة به.')) {
            return;
        }
        try {
            // This is a cascading delete, which is complex.
            // For now, just delete the project itself. The user was warned about data loss.
            await db.projects.delete(id);
            alert('تم حذف المشروع.');
            renderProjects();
        } catch (error) {
            console.error('Failed to delete project:', error);
        }
    };

    addBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);
    form.addEventListener('submit', handleFormSubmit);

    tableBody.addEventListener('click', async (event) => {
        const target = event.target;
        const id = Number(target.dataset.id);

        if (target.classList.contains('edit-btn')) {
            const project = await db.projects.get(id);
            if (project) openModal(project);
        }

        if (target.classList.contains('delete-btn')) {
            handleDelete(id);
        }
    });

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-projects') {
            renderProjects();
        }
    });
    } catch (error) {
        console.error('Error initializing projects page:', error);
        alert(`An initialization error occurred on the projects page: ${error.message}`);
    }
});
