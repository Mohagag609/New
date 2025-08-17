document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-settlement-reports');
    if (!page) return;

    const projectSelect = document.getElementById('settlement-report-project-select');
    const finalSettlementPrintBtn = document.getElementById('print-final-settlement-btn');
    const detailsPrintBtn = document.getElementById('print-settlement-details-btn');
    const executeSettlementBtn = document.getElementById('execute-settlement-btn');
    const reportContent = document.getElementById('settlement-report-content');
    const detailedPrintArea = document.getElementById('detailed-print-area');

    const investorExpensesTbody = document.getElementById('investor-expenses-report-body');
    const totalExpensesSpan = document.getElementById('settlement-total-expenses');
    const finalSettlementTbody = document.getElementById('final-settlement-report-body');
    const settlementPlanList = document.getElementById('settlement-plan-list');

    let settlementData = []; // Moved to higher scope

    const generateReports = async () => {
        const projectId = Number(projectSelect.value);
        settlementData = [];
        if (!projectId) {
            reportContent.classList.add('hidden');
            return;
        }

        try {
            // Find the last settlement for this project
            const lastSettlement = await db.project_settlements
                .where('projectId').equals(projectId)
                .last();

            let lastSettlementDate = '1970-01-01';
            let previousBalances = new Map();

            if (lastSettlement) {
                lastSettlementDate = lastSettlement.settlementDate;
                lastSettlement.investorBalances.forEach(b => {
                    previousBalances.set(b.investorId, b.balance);
                });
            }

            // Fetch vouchers created after the last settlement date
            const expenseVouchers = await db.vouchers
                .where('[projectId+date]').above([projectId, lastSettlementDate])
                .toArray();

            const projectInvestors = await db.project_investors.where({ projectId }).toArray();
            const investorIds = [...new Set(projectInvestors.map(pi => pi.investorId))];
            const investors = await db.investors.bulkGet(investorIds);
            const investorMap = new Map(investors.filter(Boolean).map(i => [i.id, i.name]));

            const totalPeriodExpenses = expenseVouchers.reduce((sum, v) => sum + (v.debit || 0), 0);
            totalExpensesSpan.textContent = formatCurrency(totalPeriodExpenses);

            const paidInPeriod = new Map();
            expenseVouchers.forEach(v => {
                if (v.paidByInvestorId) {
                    const currentPaid = paidInPeriod.get(v.paidByInvestorId) || 0;
                    // Add credits (receipts) and debits (expenses paid on behalf)
                    const amount = (v.credit || 0) + (v.debit || 0);
                    paidInPeriod.set(v.paidByInvestorId, currentPaid + amount);
                }
            });

            investorExpensesTbody.innerHTML = '';
            investorMap.forEach((name, id) => {
                const totalPaid = (previousBalances.get(id) || 0) + (paidInPeriod.get(id) || 0);
                 investorExpensesTbody.innerHTML += `
                    <tr>
                        <td class="px-5 py-3">${name}</td>
                        <td class="px-5 py-3">${formatCurrency(totalPaid)}</td>
                    </tr>
                `;
            });

            const totalShares = projectInvestors.reduce((sum, pi) => sum + (pi.share || 0), 0);
            const useEqualSplit = (totalShares < 0.99 || totalShares > 1.01);

            projectInvestors.forEach(pi => {
                const settlementRatio = useEqualSplit && projectInvestors.length > 0 ? (1 / projectInvestors.length) : (pi.share || 0);
                const totalPaid = (previousBalances.get(pi.investorId) || 0) + (paidInPeriod.get(pi.investorId) || 0);
                const fairShare = totalPeriodExpenses * settlementRatio;
                const balance = totalPaid - fairShare;
                settlementData.push({
                    investorId: pi.investorId,
                    investorName: investorMap.get(pi.investorId),
                    settlementRatio: `${(settlementRatio * 100).toFixed(2)}%`,
                    fairShare,
                    paid: totalPaid,
                    balance
                });
            });

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

            // Settlement plan logic remains the same
            let creditors = settlementData.filter(d => d.balance > 0).map(d => ({...d})).sort((a,b) => b.balance - a.balance);
            let debtors = settlementData.filter(d => d.balance < 0).map(d => ({...d, balance: -d.balance})).sort((a,b) => b.balance - a.balance);
            const transactions = [];

            while (creditors.length > 0 && debtors.length > 0) {
                const creditor = creditors[0];
                const debtor = debtors[0];
                const amount = Math.min(creditor.balance, debtor.balance);
                transactions.push({ from: debtor, to: creditor, amount });
                creditor.balance -= amount;
                debtor.balance -= amount;
                if (creditor.balance < 0.01) creditors.shift();
                if (debtor.balance < 0.01) debtors.shift();
            }

            settlementPlanList.innerHTML = '';
            if (transactions.length === 0) {
                settlementPlanList.innerHTML = '<li>لا توجد تسويات مطلوبة.</li>';
                executeSettlementBtn.disabled = true;
            } else {
                transactions.forEach(t => {
                    settlementPlanList.innerHTML += `<li>${t.from.investorName} يدفع ${formatCurrency(t.amount)} إلى ${t.to.investorName}</li>`;
                });
                executeSettlementBtn.disabled = false;
            }


            reportContent.classList.remove('hidden');
        } catch (error) {
            console.error('Failed to generate settlement reports:', error);
        }
    };

    const executeSettlement = async () => {
        if (executeSettlementBtn.disabled || settlementData.length === 0) return;

        const confirmation = confirm("هل أنت متأكد من تنفيذ وحفظ هذه التسوية؟ سيتم أرشفة جميع الحركات الحالية وتصبح نقطة البداية للتسوية القادمة.");
        if (!confirmation) return;

        const projectId = Number(projectSelect.value);
        const today = new Date().toISOString().split('T')[0];

        // We need the total expenses from the UI to store in the snapshot
        const totalExpenses = settlementData.reduce((sum, d) => sum + d.fairShare, 0);

        const settlementRecord = {
            projectId: projectId,
            settlementDate: today,
            totalExpensesSettled: totalExpenses,
            investorBalances: settlementData.map(d => ({
                investorId: d.investorId,
                investorName: d.investorName,
                balance: d.paid // The amount they have contributed so far
            }))
        };

        try {
            await db.project_settlements.add(settlementRecord);
            alert('تم حفظ التسوية بنجاح!');
            await generateReports(); // Refresh the report view
            alert('تم تحديث التقرير. المصروفات تمت تصفيتها، والأرصدة الجديدة تمثل نقطة البداية القادمة.');
        } catch (error) {
            console.error('Failed to save settlement snapshot:', error);
            alert('حدث خطأ أثناء حفظ التسوية.');
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
    executeSettlementBtn.addEventListener('click', executeSettlement);

    finalSettlementPrintBtn.addEventListener('click', () => {
        const projectName = projectSelect.options[projectSelect.selectedIndex].text;
        if (!projectName) {
            alert("الرجاء اختيار مشروع أولاً.");
            return;
        }
        printContent('final-settlement-div', `التسوية النهائية - ${projectName}`);
    });

    const generateAndPrintDetailedReport = async () => {
        const projectId = Number(projectSelect.value);
        const projectName = projectSelect.options[projectSelect.selectedIndex].text;
        if (!projectId) {
            alert("الرجاء اختيار مشروع أولاً.");
            return;
        }

        try {
            const [vouchers, accounts, parties, projectInvestors] = await Promise.all([
                db.settlement_vouchers.where({ projectId }).toArray(),
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

            const investorMap = new Map(investors.map(i => [i.id, i.name]));
            const accountMap = new Map(accounts.map(a => [a.id, a.name]));
            const partyMap = new Map(parties.map(p => [p.id, p.name]));

            const vouchersByInvestor = new Map();
            investors.forEach(inv => vouchersByInvestor.set(inv.id, []));
            vouchers.filter(v => v.type !== 'Settlement').forEach(v => {
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
                                <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold uppercase">الحساب</th>
                                <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold uppercase">المورد</th>
                                <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold uppercase">البيان</th>
                                <th class="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold uppercase">المبلغ</th>
                            </tr>
                        </thead>
                        <tbody>`;

                    let total = 0;
                    investorVouchers.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(v => {
                        const accountName = accountMap.get(v.categoryId) || 'غير معروف';
                        const partyName = v.partyId ? partyMap.get(v.partyId) || 'غير معروف' : '';

                        reportHtml += `<tr>
                            <td class="px-5 py-2 border-b">${v.date}</td>
                            <td class="px-5 py-2 border-b">${accountName}</td>
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
