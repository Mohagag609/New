document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-settlement-ratios');
    if (!page) return;

    // --- DOM Elements ---
    const projectSelect = document.getElementById('ratio-project-select');
    const ratiosContainer = document.getElementById('ratios-container');
    const ratiosProjectName = document.getElementById('ratios-project-name');
    const ratiosList = document.getElementById('ratios-list');
    const ratiosTotalSpan = document.getElementById('ratios-total');
    const addInvestorForm = document.getElementById('add-investor-to-ratio-form');
    const addInvestorSelect = document.getElementById('add-investor-select');
    const saveBtn = document.getElementById('save-ratios-btn');

    let currentProjectLinks = [];

    const updateTotal = () => {
        const inputs = ratiosList.querySelectorAll('input');
        const total = Array.from(inputs).reduce((sum, input) => sum + (Number(input.value) || 0), 0);
        ratiosTotalSpan.textContent = total.toFixed(2);
        if (total > 99.99 && total < 100.01) {
            ratiosTotalSpan.classList.remove('text-red-500');
            ratiosTotalSpan.classList.add('text-green-500');
        } else {
            ratiosTotalSpan.classList.remove('text-green-500');
            ratiosTotalSpan.classList.add('text-red-500');
        }
    };

    const handleProjectSelect = async () => {
        const projectId = Number(projectSelect.value);
        if (!projectId) {
            ratiosContainer.classList.add('hidden');
            return;
        }

        const project = await settlementDb.projects.get(projectId);
        ratiosProjectName.textContent = project.name;

        currentProjectLinks = await settlementDb.project_investors.where({ projectId }).toArray();
        const linkedInvestorIds = new Set(currentProjectLinks.map(l => l.investorId));

        const allInvestors = await settlementDb.investors.toArray();
        const linkedInvestors = allInvestors.filter(i => linkedInvestorIds.has(i.id));
        const unlinkedInvestors = allInvestors.filter(i => !linkedInvestorIds.has(i.id));

        const investorMap = new Map(linkedInvestors.map(i => [i.id, i.name]));

        // Populate the "Add Investor" dropdown
        addInvestorSelect.innerHTML = '<option value="">اختر مستثمراً لإضافته...</option>';
        unlinkedInvestors.forEach(inv => {
            const option = document.createElement('option');
            option.value = inv.id;
            option.textContent = inv.name;
            addInvestorSelect.appendChild(option);
        });

        ratiosList.innerHTML = '';
        currentProjectLinks.forEach(link => {
            const div = document.createElement('div');
            div.className = 'flex items-center space-x-4 space-x-reverse';
            div.innerHTML = `
                <label class="w-1/3">${investorMap.get(link.investorId)}</label>
                <input type="number" step="0.01" min="0" max="100"
                       class="ratio-input mt-1 block w-1/3 border-gray-300 rounded-md"
                       data-link-id="${link.id}"
                       value="${(link.share || 0) * 100}">
                <span class="w-1/3">%</span>
            `;
            ratiosList.appendChild(div);
        });

        updateTotal();
        ratiosContainer.classList.remove('hidden');
    };

    const handleSaveRatios = async () => {
        const total = parseFloat(ratiosTotalSpan.textContent);
        if (total < 99.99 || total > 100.01) {
            alert('يجب أن يكون إجمالي النسب 100% بالضبط.');
            return;
        }

        const inputs = ratiosList.querySelectorAll('input.ratio-input');
        const updates = Array.from(inputs).map(input => {
            return {
                key: Number(input.dataset.linkId),
                changes: { share: (Number(input.value) || 0) / 100 }
            };
        });

        try {
            await settlementDb.project_investors.bulkUpdate(updates);
            alert('تم حفظ النسب بنجاح!');
        } catch (error) {
            console.error('Failed to save ratios:', error);
            alert('حدث خطأ أثناء حفظ النسب.');
        }
    };

    const initializePage = async () => {
        const projects = await settlementDb.projects.toArray();
        projectSelect.innerHTML = '<option value="">اختر مشروعاً...</option>';
        projects.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.name;
            projectSelect.appendChild(option);
        });
        ratiosContainer.classList.add('hidden');
    };

    const handleAddInvestorToProject = async (e) => {
        e.preventDefault();
        const projectId = Number(projectSelect.value);
        const investorId = Number(addInvestorSelect.value);

        if (!projectId || !investorId) {
            alert('الرجاء اختيار مشروع ومستثمر.');
            return;
        }

        try {
            await settlementDb.project_investors.add({
                projectId: projectId,
                investorId: investorId,
                share: 0 // Default share
            });
            // Refresh the entire view
            handleProjectSelect();
        } catch (error) {
            console.error('Failed to add investor to project:', error);
            if (error.name === 'ConstraintError') {
                alert('هذا المستثمر مرتبط بالفعل بهذا المشروع.');
            } else {
                alert('فشل إضافة المستثمر للمشروع.');
            }
        }
    };

    // --- Event Listeners ---
    projectSelect.addEventListener('change', handleProjectSelect);
    addInvestorForm.addEventListener('submit', handleAddInvestorToProject);
    saveBtn.addEventListener('click', handleSaveRatios);
    ratiosList.addEventListener('input', updateTotal);

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-settlement-ratios') {
            initializePage();
        }
    });
});
