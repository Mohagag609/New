document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-settlement-reports');
    if (!page) return;

    const projectSelect = document.getElementById('settlement-report-project-select');
    const finalSettlementPrintBtn = document.getElementById('print-final-settlement-btn');
    const detailsPrintBtn = document.getElementById('print-settlement-details-btn');
    // const printBtn = document.getElementById('print-settlement-report-btn'); // Old generic button
    const reportContent = document.getElementById('settlement-report-content');

    const investorExpensesTbody = document.getElementById('investor-expenses-report-body');
    const totalExpensesSpan = document.getElementById('settlement-total-expenses');
    const finalSettlementTbody = document.getElementById('final-settlement-report-body');
    const settlementPlanList = document.getElementById('settlement-plan-list');

    // const formatCurrency = (amount) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);
    // This function is now globally available from print-helper.js

    const generateReports = async () => {
        const projectId = Number(projectSelect.value);
        if (!projectId) {
            reportContent.classList.add('hidden');
            return;
        }

        try {
            // 1. Fetch all necessary data for the selected project
            const [vouchers, projectInvestors] = await Promise.all([
                db.settlement_vouchers.where({ projectId }).toArray(),
                db.project_investors.where({ projectId }).toArray()
            ]);

            // 1a. Get all unique investor IDs from both lists and fetch their data
            const investorIdsFromVouchers = vouchers.map(v => v.paidByInvestorId);
            const investorIdsFromProject = projectInvestors.map(pi => pi.investorId);
            const allUniqueInvestorIds = [...new Set([...investorIdsFromVouchers, ...investorIdsFromProject])];
            const allInvestors = await db.investors.bulkGet(allUniqueInvestorIds);

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
            const totalShares = projectInvestors.reduce((sum, pi) => sum + (pi.share || 0), 0);
            const useEqualSplit = (totalShares < 0.99 || totalShares > 1.01);

            if(useEqualSplit && projectInvestors.length > 0) {
                console.log("Using default equal split for settlement.");
            }

            projectInvestors.forEach(pi => {
                const settlementRatio = useEqualSplit
                    ? (1 / projectInvestors.length)
                    : (pi.share || 0);

                const paid = paidByInvestor.get(pi.investorId) || 0;
                const fairShare = totalExpenses * settlementRatio;
                const balance = paid - fairShare;

                settlementData.push({
                    investorId: pi.investorId,
                    investorName: investorMap.get(pi.investorId),
                    settlementRatio: `${(settlementRatio * 100).toFixed(2)}%`,
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
        const projects = await db.projects.toArray();
        projectSelect.innerHTML = '<option value="">اختر مشروعاً...</option>';
        projects.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id;
            option.textContent = p.name;
            projectSelect.appendChild(option);
        });
    };

    projectSelect.addEventListener('change', generateReports);

    finalSettlementPrintBtn.addEventListener('click', () => {
        const projectName = projectSelect.options[projectSelect.selectedIndex].text;
        if (!projectName) {
            alert("الرجاء اختيار مشروع أولاً.");
            return;
        }
        printContent('final-settlement-div', `التسوية النهائية - ${projectName}`);
    });

    const detailedPrintArea = document.getElementById('detailed-print-area');

    const generateAndPrintDetailedReport = async () => {
        const projectId = Number(projectSelect.value);
        const projectName = projectSelect.options[projectSelect.selectedIndex].text;
        if (!projectId) {
            alert("الرجاء اختيار مشروع أولاً.");
            return;
        }

        try {
            // Fetch all data needed for the report in parallel
            const [vouchers, categories, accounts, parties, projectInvestors] = await Promise.all([
                db.settlement_vouchers.where({ projectId }).toArray(),
                db.expense_categories.toArray(),
                db.accounts.toArray(),
                db.parties.toArray(),
                db.project_investors.where({ projectId }).toArray()
            ]);

            const investorIds = [...new Set(projectInvestors.map(pi => pi.investorId))];
            if (investorIds.length === 0) {
                alert("لا يوجد مستثمرون مرتبطون بهذا المشروع.");
                return;
            }
            const investors = await db.investors.bulkGet(investorIds);

            // Create maps for efficient lookups
            const investorMap = new Map(investors.map(i => [i.id, i.name]));
            const categoryMap = new Map(categories.map(c => [c.id, c.name]));
            const accountMap = new Map(accounts.map(a => [a.id, a.name]));
            const partyMap = new Map(parties.map(p => [p.id, p.name]));

            // Group vouchers by investor
            const vouchersByInvestor = new Map();
            investors.forEach(inv => vouchersByInvestor.set(inv.id, []));
            vouchers.forEach(v => {
                if (vouchersByInvestor.has(v.paidByInvestorId)) {
                    vouchersByInvestor.get(v.paidByInvestorId).push(v);
                }
            });

            let reportHtml = `<h1 class="text-2xl font-bold text-center mb-4">تقرير المصروفات التفصيلي لمشروع: ${projectName}</h1>`;

            for (const [investorId, investorVouchers] of vouchersByInvestor.entries()) {
                const investorName = investorMap.get(investorId);
                reportHtml += `<div class="mb-8" style="page-break-after: always;">`;
                reportHtml += `<h2 class="text-xl font-bold border-b-2 border-gray-300 pb-2 mb-4">المستثمر: ${investorName}</h2>`;

                if (investorVouchers.length === 0) {
                    reportHtml += `<p>لا توجد مصروفات مسجلة لهذا المستثمر.</p>`;
                } else {
                    reportHtml += `<table class="min-w-full leading-normal" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold uppercase">التاريخ</th>
                                <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold uppercase">التصنيف / الحساب</th>
                                <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold uppercase">المورد</th>
                                <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold uppercase">البيان</th>
                                <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold uppercase">المبلغ</th>
                            </tr>
                        </thead>
                        <tbody>`;

                    let total = 0;
                    investorVouchers.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(v => {
                        // Fallback logic for category name
                        const categoryName = categoryMap.get(v.categoryId) || accountMap.get(v.categoryId) || 'غير معروف';
                        const partyName = v.partyId ? partyMap.get(v.partyId) || 'غير معروف' : '';

                        reportHtml += `<tr>
                            <td class="px-5 py-2 border-b">${v.date}</td>
                            <td class="px-5 py-2 border-b">${categoryName}</td>
                            <td class="px-5 py-2 border-b">${partyName}</td>
                            <td class="px-5 py-2 border-b">${v.notes || ''}</td>
                            <td class="px-5 py-2 border-b text-left">${formatCurrency(v.amount)}</td>
                        </tr>`;
                        total += v.amount;
                    });

                    reportHtml += `</tbody>
                        <tfoot>
                            <tr>
                                <td colspan="4" class="px-5 py-2 border-t-2 font-bold text-right">الإجمالي</td>
                                <td class="px-5 py-2 border-t-2 font-bold text-left">${formatCurrency(total)}</td>
                            </tr>
                        </tfoot>
                    </table>`;
                }
                reportHtml += `</div>`;
            }

            detailedPrintArea.innerHTML = reportHtml;
            printContent('detailed-print-area', `تقرير تفصيلي - ${projectName}`);

        } catch (error) {
            console.error('Failed to generate detailed report:', error);
            alert('حدث خطأ أثناء إنشاء التقرير التفصيلي.');
        }
    };

    detailsPrintBtn.addEventListener('click', generateAndPrintDetailedReport);

    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-settlement-reports') {
            initializePage();
        }
    });
});
