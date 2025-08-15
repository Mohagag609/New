document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-settlement-reports');
    if (!page) return;

    const projectSelect = document.getElementById('settlement-report-project-select');
    const reportContent = document.getElementById('settlement-report-content');

    const investorExpensesTbody = document.getElementById('investor-expenses-report-body');
    const totalExpensesSpan = document.getElementById('settlement-total-expenses');
    const finalSettlementTbody = document.getElementById('final-settlement-report-body');
    const settlementPlanList = document.getElementById('settlement-plan-list');

    const formatCurrency = (amount) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);

    const generateReports = async () => {
        const projectId = Number(projectSelect.value);
        if (!projectId) {
            reportContent.classList.add('hidden');
            return;
        }

        try {
            // 1. Fetch all necessary data for the selected project
            const [vouchers, projectInvestors] = await Promise.all([
                settlementDb.settlement_vouchers.where({ projectId }).toArray(),
                settlementDb.project_investors.where({ projectId }).toArray()
            ]);

            // 1a. Get all unique investor IDs from both lists and fetch their data
            const investorIdsFromVouchers = vouchers.map(v => v.paidByInvestorId);
            const investorIdsFromProject = projectInvestors.map(pi => pi.investorId);
            const allUniqueInvestorIds = [...new Set([...investorIdsFromVouchers, ...investorIdsFromProject])];
            const allInvestors = await settlementDb.investors.bulkGet(allUniqueInvestorIds);

            const investorMap = new Map(allInvestors.filter(i => i).map(i => [i.id, i.name]));

            // 2. Calculate total expenses for the project
            const totalExpenses = vouchers.reduce((sum, v) => sum + v.amount, 0);
            totalExpensesSpan.textContent = formatCurrency(totalExpenses);

            // 3. Calculate total paid amount by each investor
            const paidByInvestor = new Map();
            vouchers.forEach(v => {
                const currentPaid = paidByInvestor.get(v.paidByInvestorId) || 0;
                paidByInvestor.set(v.paidByInvestorId, currentPaid + v.amount);
            });

            // 4. Render Investor Expenses Report
            investorExpensesTbody.innerHTML = '';
            for (const [investorId, totalPaid] of paidByInvestor.entries()) {
                investorExpensesTbody.innerHTML += `
                    <tr>
                        <td class="px-5 py-3">${investorMap.get(investorId) || 'غير معروف'}</td>
                        <td class="px-5 py-3">${formatCurrency(totalPaid)}</td>
                    </tr>
                `;
            }

            // 5. Calculate Final Settlement
            const settlementData = [];
            projectInvestors.forEach(pi => {
                const paid = paidByInvestor.get(pi.investorId) || 0;
                const fairShare = totalExpenses * (pi.share || 0); // Assuming share is a ratio e.g., 0.5
                const balance = paid - fairShare;
                settlementData.push({
                    investorId: pi.investorId,
                    investorName: investorMap.get(pi.investorId),
                    settlementRatio: `${((pi.share || 0) * 100).toFixed(2)}%`,
                    fairShare: fairShare,
                    paid: paid,
                    balance: balance
                });
            });

            // 6. Render Final Settlement Table
            finalSettlementTbody.innerHTML = '';
            settlementData.forEach(data => {
                const balanceClass = data.balance >= 0 ? 'text-green-600' : 'text-red-600';
                finalSettlementTbody.innerHTML += `
                    <tr>
                        <td class="px-5 py-3">${data.investorName}</td>
                        <td class="px-5 py-3">${data.settlementRatio}</td>
                        <td class="px-5 py-3">${formatCurrency(data.fairShare)}</td>
                        <td class="px-5 py-3">${formatCurrency(data.paid)}</td>
                        <td class="px-5 py-3 font-bold ${balanceClass}">${formatCurrency(data.balance)}</td>
                    </tr>
                `;
            });

            // 7. Generate Settlement Plan (Greedy Algorithm)
            let creditors = settlementData.filter(d => d.balance > 0).sort((a, b) => b.balance - a.balance);
            let debtors = settlementData.filter(d => d.balance < 0).map(d => ({...d, balance: -d.balance})).sort((a, b) => b.balance - a.balance);
            const transactions = [];

            while(creditors.length > 0 && debtors.length > 0) {
                const creditor = creditors[0];
                const debtor = debtors[0];
                const amount = Math.min(creditor.balance, debtor.balance);

                transactions.push(`${debtor.investorName} يدفع ${formatCurrency(amount)} إلى ${creditor.investorName}`);

                creditor.balance -= amount;
                debtor.balance -= amount;

                if (creditor.balance < 0.01) creditors.shift();
                if (debtor.balance < 0.01) debtors.shift();
            }

            // 8. Render Settlement Plan
            settlementPlanList.innerHTML = '';
            transactions.forEach(t => {
                settlementPlanList.innerHTML += `<li>${t}</li>`;
            });

            reportContent.classList.remove('hidden');

        } catch (error) {
            console.error('Failed to generate settlement reports:', error);
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
    };

    projectSelect.addEventListener('change', generateReports);

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-settlement-reports') {
            initializePage();
        }
    });
});
