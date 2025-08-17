document.addEventListener('DOMContentLoaded', () => {
    let isInitialized = false;

    const init = () => {
        isInitialized = true;

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
        const projInvModal = document.getElementById('project-investors-modal');
        const projInvModalTitle = document.getElementById('proj-inv-modal-title');
        const linkInvestorForm = document.getElementById('link-investor-form');
        const investorSelect = document.getElementById('investor-select');
        const investorShareInput = document.getElementById('investor-share');
        const projInvList = document.getElementById('project-investors-list');
        const closeProjInvBtn = document.getElementById('close-proj-inv-modal-btn');
        let currentManagingProjectId = null;

        // --- Functions ---
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
                alert(error.name === 'ConstraintError' ? 'اسم المشروع موجود بالفعل.' : 'حدث خطأ أثناء حفظ المشروع.');
            }
        };

        const handleDelete = async (id) => {
            if (!confirm('هل أنت متأكد أنك تريد حذف هذا المشروع؟ سيتم حذف جميع البيانات المرتبطة به.')) return;
            try {
                await db.projects.delete(id);
                // Note: Cascading delete for related data would be needed in a real app.
                alert('تم حذف المشروع.');
                renderProjects();
            } catch (error) {
                console.error('Failed to delete project:', error);
            }
        };

        const openManageInvestorsModal = async (projectId) => {
            currentManagingProjectId = projectId;
            const project = await db.projects.get(projectId);
            if (!project) return;
            projInvModalTitle.textContent = project.name;
            linkInvestorForm.reset();
            const allInvestors = await db.investors.toArray();
            investorSelect.innerHTML = '<option value="">اختر مستثمراً...</option>';
            allInvestors.forEach(inv => {
                const option = document.createElement('option');
                option.value = inv.id;
                option.textContent = inv.name;
                investorSelect.appendChild(option);
            });
            await renderLinkedInvestors(projectId);
            projInvModal.classList.remove('hidden');
        };

        const renderLinkedInvestors = async (projectId) => {
            const links = await db.project_investors.where({ projectId }).toArray();
            const investorIds = links.map(l => l.investorId);
            const investors = await db.investors.bulkGet(investorIds);
            const investorMap = new Map(investors.map(i => [i.id, i.name]));
            projInvList.innerHTML = '';
            links.forEach(link => {
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center p-1';
                li.innerHTML = `
                    <span>${investorMap.get(link.investorId) || 'مستثمر غير معروف'} (الحصة: ${link.share || 'N/A'})</span>
                    <button class="remove-investor-link-btn text-red-500 hover:text-red-700" data-link-id="${link.id}">إزالة</button>
                `;
                projInvList.appendChild(li);
            });
        };

        const handleLinkInvestor = async (e) => {
            e.preventDefault();
            const investorId = Number(investorSelect.value);
            const share = Number(investorShareInput.value);
            if (!investorId || !currentManagingProjectId) return;
            try {
                await db.project_investors.add({
                    projectId: currentManagingProjectId,
                    investorId: investorId,
                    share: share
                });
                await renderLinkedInvestors(currentManagingProjectId);
                linkInvestorForm.reset();
            } catch (error) {
                console.error("Failed to link investor:", error);
                alert(error.name === 'ConstraintError' ? 'هذا المستثمر مرتبط بالفعل بهذا المشروع.' : 'فشل ربط المستثمر.');
            }
        };

        const handleRemoveLink = async (linkId) => {
            if (!confirm('هل أنت متأكد من إزالة هذا المستثمر من المشروع؟')) return;
            try {
                await db.project_investors.delete(linkId);
                await renderLinkedInvestors(currentManagingProjectId);
            } catch (error) {
                console.error('Failed to remove investor link:', error);
            }
        };

        // --- Event Listeners ---
        addBtn.addEventListener('click', () => openModal());
        cancelBtn.addEventListener('click', closeModal);
        form.addEventListener('submit', handleFormSubmit);
        closeProjInvBtn.addEventListener('click', () => projInvModal.classList.add('hidden'));
        linkInvestorForm.addEventListener('submit', handleLinkInvestor);

        projInvList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-investor-link-btn')) {
                handleRemoveLink(Number(e.target.dataset.linkId));
            }
        });

        tableBody.addEventListener('click', async (event) => {
            const target = event.target;
            const id = Number(target.dataset.id);
            if (target.classList.contains('edit-btn')) {
                const project = await db.projects.get(id);
                if (project) openModal(project);
            } else if (target.classList.contains('delete-btn')) {
                handleDelete(id);
            } else if (target.classList.contains('manage-investors-btn')) {
                openManageInvestorsModal(id);
            }
        });
    };

    const renderProjects = async () => {
        try {
            const tableBody = document.getElementById('projects-table-body');
            const projects = await db.projects.toArray();
            tableBody.innerHTML = '';
            projects.forEach(p => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${p.name}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm">${p.description || ''}</td>
                    <td class="px-5 py-5 border-b border-gray-200 bg-white text-sm space-x-2 space-x-reverse">
                        <button class="manage-investors-btn bg-teal-500 hover:bg-teal-700 text-white font-bold py-1 px-2 rounded" data-id="${p.id}">المستثمرون</button>
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

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-projects') {
            if (!isInitialized) {
                init();
            }
            renderProjects();
        }
    });
});
