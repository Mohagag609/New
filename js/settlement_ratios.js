document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-settlement-ratios');
    if (!page) return;

    const projectSelect = document.getElementById('ratio-project-select');
    const ratiosContainer = document.getElementById('ratios-container');
    const ratiosProjectName = document.getElementById('ratios-project-name');
    const ratiosList = document.getElementById('ratios-list');
    const ratiosTotalSpan = document.getElementById('ratios-total');
    const addInvestorForm = document.getElementById('add-investor-to-ratio-form');
    const addInvestorSelect = document.getElementById('add-investor-select');
    const addInvestorShareInput = document.getElementById('add-investor-share-input');
    const saveBtn = document.getElementById('save-ratios-btn');

    let currentRatios = [];
    let allInvestors = [];
    let investorMap = new Map();

    const updateTotal = () => {
        const total = currentRatios.reduce((sum, ratio) => sum + (Number(ratio.share) * 100 || 0), 0);
        ratiosTotalSpan.textContent = total.toFixed(2);
        ratiosTotalSpan.className = (total > 99.99 && total < 100.01) ? 'text-green-500' : 'text-red-500';
    };

    const renderRatios = () => {
        ratiosList.innerHTML = '';
        currentRatios.forEach((ratio, index) => {
            const div = document.createElement('div');
            div.className = 'flex items-center space-x-4 space-x-reverse p-1';
            div.innerHTML = `
                <label class="w-1/3">${investorMap.get(ratio.investorId)}</label>
                <input type="number" step="0.01" min="0" max="100"
                       class="ratio-input mt-1 block w-1/3 border-gray-300 rounded-md"
                       data-index="${index}"
                       value="${(ratio.share || 0) * 100}">
                <span class="w-1/6">%</span>
                <button class="delete-ratio-btn bg-red-500 text-white py-1 px-2 rounded" data-index="${index}">حذف</button>
            `;
            ratiosList.appendChild(div);
        });

        const linkedInvestorIds = new Set(currentRatios.map(r => r.investorId));
        const unlinkedInvestors = allInvestors.filter(i => !linkedInvestorIds.has(i.id));

        addInvestorSelect.innerHTML = '<option value="">اختر مستثمراً لإضافته...</option>';
        unlinkedInvestors.forEach(inv => {
            const option = document.createElement('option');
            option.value = inv.id;
            option.textContent = inv.name;
            addInvestorSelect.appendChild(option);
        });

        updateTotal();
    };

    const handleProjectSelect = async () => {
        const projectId = Number(projectSelect.value);
        if (!projectId) {
            ratiosContainer.classList.add('hidden');
            return;
        }

        const project = await db.projects.get(projectId);
        ratiosProjectName.textContent = project.name;

        allInvestors = await db.investors.toArray();
        investorMap = new Map(allInvestors.map(i => [i.id, i.name]));

        currentRatios = await db.settlementRatios.where({ projectId }).toArray();

        renderRatios();
        ratiosContainer.classList.remove('hidden');
    };

    const handleAddInvestor = (e) => {
        e.preventDefault();
        const projectId = Number(projectSelect.value);
        const investorId = Number(addInvestorSelect.value);
        const sharePercent = Number(addInvestorShareInput.value) || 0;

        if (!investorId) return alert('الرجاء اختيار مستثمر.');

        currentRatios.push({
            projectId: projectId,
            investorId: investorId,
            share: sharePercent / 100
        });

        addInvestorForm.reset();
        renderRatios();
    };

    const handleRatioInputChange = (e) => {
        const index = Number(e.target.dataset.index);
        const newSharePercent = Number(e.target.value) || 0;
        if (currentRatios[index]) {
            currentRatios[index].share = newSharePercent / 100;
        }
        updateTotal();
    };

    const handleRatioDelete = (e) => {
        if (!e.target.classList.contains('delete-ratio-btn')) return;
        const index = Number(e.target.dataset.index);
        currentRatios.splice(index, 1);
        renderRatios();
    };

    const handleSaveRatios = async () => {
        const total = parseFloat(ratiosTotalSpan.textContent);
        if (total < 99.99 || total > 100.01) {
            return alert('يجب أن يكون إجمالي النسب 100% بالضبط.');
        }

        const projectId = Number(projectSelect.value);

        try {
            await db.transaction('rw', db.settlementRatios, async () => {
                const oldLinks = await db.settlementRatios.where({ projectId }).toArray();
                const oldLinkIds = oldLinks.map(link => link.id);
                if (oldLinkIds.length > 0) {
                    await db.settlementRatios.bulkDelete(oldLinkIds);
                }
                const newRatiosToSave = currentRatios.map(({ id, ...rest }) => rest);
                if (newRatiosToSave.length > 0) {
                    await db.settlementRatios.bulkAdd(newRatiosToSave);
                }
            });

            alert('تم حفظ النسب بنجاح!');
            await handleProjectSelect();
        } catch (error) {
            console.error('Failed to save ratios:', error);
            alert('حدث خطأ أثناء حفظ النسب.');
        }
    };

    const initializePage = async () => {
        const projects = await db.projects.toArray();
        projectSelect.innerHTML = '<option value="">اختر مشروعاً...</option>';
        projects.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.name;
            projectSelect.appendChild(option);
        });
        ratiosContainer.classList.add('hidden');
    };

    projectSelect.addEventListener('change', handleProjectSelect);
    addInvestorForm.addEventListener('submit', handleAddInvestor);
    saveBtn.addEventListener('click', handleSaveRatios);
    ratiosList.addEventListener('input', handleRatioInputChange);
    ratiosList.addEventListener('click', handleRatioDelete);

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-settlement-ratios') {
            initializePage();
        }
    });
});
