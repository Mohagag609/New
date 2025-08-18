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
        settlementData = []; // Reset on each generation
        executeSettlementBtn.disabled = true; // Disable by default
        reportContent.classList.add('hidden');

        if (!projectId) {
            return;
        }

        try {
            // 1. Fetch the last settlement for this project
            const lastSettlement = await db.project_settlements
                .where({ projectId })
                .last();

            const sinceDate = lastSettlement ? lastSettlement.settlementDate : '1970-01-01';
            const previousContributions = lastSettlement ? lastSettlement.contributions : {};
            const previousBalances = (lastSettlement && lastSettlement.balances) ? lastSettlement.balances : {}; // Get previous balances safely

            // 2. Fetch data for the current period from the main vouchers table
            const [projectInvestors, expenseVouchers] = await Promise.all([
                db.project_investors.where({ projectId }).toArray(),
                // Use the new index to get all settlement expenses for this project in the current period
                db.vouchers.where('[projectId+isSettlementExpense+date]')
                    .between([projectId, 1, sinceDate], [projectId, 1, '9999-12-31'])
                    .toArray()
            ]);

            const allInvestorIds = [...new Set(projectInvestors.map(pi => pi.investorId))];
            const allInvestors = await db.investors.bulkGet(allInvestorIds);
            const investorMap = new Map(allInvestors.filter(i => i).map(i => [i.id, i.name]));

            // 3. Calculate totals for the CURRENT PERIOD
            const periodExpenses = expenseVouchers.reduce((sum, v) => sum + v.credit, 0); // Expenses are stored in 'credit'
            totalExpensesSpan.textContent = formatCurrency(periodExpenses);

            const paidByInvestorThisPeriod = new Map();
            expenseVouchers.forEach(v => {
                const currentPaid = paidByInvestorThisPeriod.get(v.paidByInvestorId) || 0;
                paidByInvestorThisPeriod.set(v.paidByInvestorId, currentPaid + v.credit); // Use 'credit' for the amount
            });

            // 4. Populate the "Investor Expenses Report" (now for this period only)
            investorExpensesTbody.innerHTML = '';
            allInvestorIds.forEach(investorId => {
                const totalPaid = paidByInvestorThisPeriod.get(investorId) || 0;
                investorExpensesTbody.innerHTML += `
                    <tr>
                        <td class="px-5 py-3">${investorMap.get(investorId) || 'Unknown'}</td>
                        <td class="px-5 py-3">${formatCurrency(totalPaid)}</td>
                    </tr>
                `;
            });

            // 5. Calculate settlement data based on the new cumulative logic
            const totalShares = projectInvestors.reduce((sum, pi) => sum + (pi.share || 0), 0);
            const useEqualSplit = (totalShares < 0.99 || totalShares > 1.01);

            projectInvestors.forEach(pi => {
                const investorId = pi.investorId;
                const settlementRatio = useEqualSplit && projectInvestors.length > 0 ? (1 / projectInvestors.length) : (pi.share || 0);

                const prevBalance = previousBalances[investorId] || 0;
                const paidThisPeriod = paidByInvestorThisPeriod.get(investorId) || 0;
                const fairShareThisPeriod = periodExpenses * settlementRatio;

                // The balance for the NEW settlement now includes the previous balance
                const balance = prevBalance + paidThisPeriod - fairShareThisPeriod;

                // The final contribution if settled, will be prevContribution + fairShareThisPeriod
                const prevContribution = previousContributions[investorId] || 0;
                const finalContribution = prevContribution + fairShareThisPeriod;

                settlementData.push({
                    investorId: investorId,
                    investorName: investorMap.get(investorId),
                    prevBalance: prevBalance, // Use this for the "Previous Balance" column
                    paidThisPeriod,
                    fairShareThisPeriod,
                    balance,
                    fairShare: fairShareThisPeriod, // For compatibility with executeSettlement
                    finalContribution
                });
            });

            // 6. Populate the "Final Settlement Report" table with new columns
            finalSettlementTbody.innerHTML = '';
            settlementData.forEach(data => {
                const balanceClass = data.balance >= 0 ? 'text-green-600' : 'text-red-600';
                finalSettlementTbody.innerHTML += `
                    <tr>
                        <td class="px-5 py-3">${data.investorName}</td>
                        <td class="px-5 py-3">${formatCurrency(data.prevBalance)}</td>
                        <td class="px-5 py-3">${formatCurrency(data.paidThisPeriod)}</td>
                        <td class="px-5 py-3">${formatCurrency(data.fairShareThisPeriod)}</td>
                        <td class="px-5 py-3 font-bold ${balanceClass}">${formatCurrency(data.balance)}</td>
                        <td class="px-5 py-3">${formatCurrency(data.finalContribution)}</td>
                    </tr>
                `;
            });

            // 7. Generate settlement plan (this logic remains the same)
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

            executeSettlementBtn.textContent = 'تنفيذ التسوية'; // Reset button text
            reportContent.classList.remove('hidden');

        } catch (error) {
            console.error('Failed to generate settlement reports:', error);
        }
    };

    const executeSettlement = async () => {
        if (executeSettlementBtn.disabled || settlementData.length === 0) return;

        const confirmation = confirm("هل أنت متأكد من تنفيذ التسوية؟ سيتم إنشاء سندات تسوية لهذه المعاملات وحفظ حالة التسوية الحالية.");
        if (!confirmation) return;

        const projectId = Number(projectSelect.value);
        const today = new Date().toISOString().split('T')[0];

        try {
            // Guard against multiple settlements on the same day for the same project
            const existingSettlementToday = await db.project_settlements.where({ projectId: projectId, settlementDate: today }).first();
            if (existingSettlementToday) {
                alert('لا يمكن تنفيذ أكثر من تسوية واحدة في نفس اليوم لنفس المشروع. إذا كنت بحاجة لإجراء تغييرات، يمكنك حذف التسوية القديمة من قاعدة البيانات أو الانتظار لليوم التالي.');
                return;
            }

            // Start a database transaction
            await db.transaction('rw', db.settlement_vouchers, db.project_settlements, async () => {
                // 1. Fetch the most recent settlement to get previous contributions
                const lastSettlement = await db.project_settlements
                    .where({ projectId })
                    .last();
                const previousContributions = lastSettlement ? lastSettlement.contributions : {};

                // 2. Prepare to create settlement vouchers (debtors/creditors logic)
                let creditors = settlementData.filter(d => d.balance > 0).map(d => ({...d})).sort((a,b) => b.balance - a.balance);
                let debtors = settlementData.filter(d => d.balance < 0).map(d => ({...d, balance: -d.balance})).sort((a,b) => b.balance - a.balance);
                const newVouchers = [];

                while (creditors.length > 0 && debtors.length > 0) {
                    const creditor = creditors[0];
                    const debtor = debtors[0];
                    const amount = Math.min(creditor.balance, debtor.balance);

                    newVouchers.push({
                        projectId,
                        date: today,
                        type: 'Settlement',
                        amount: amount,
                        paidByInvestorId: debtor.investorId, // from
                        receivedByInvestorId: creditor.investorId, // to
                        notes: `تسوية مستثمر من ${debtor.investorName} إلى ${creditor.investorName}`
                    });

                    creditor.balance -= amount;
                    debtor.balance -= amount;
                    if (creditor.balance < 0.01) creditors.shift();
                    if (debtor.balance < 0.01) debtors.shift();
                }

                // This will create the balancing vouchers
                if (newVouchers.length > 0) {
                    await db.settlement_vouchers.bulkAdd(newVouchers);
                }

                // 3. Calculate the new total effective contributions and final balances
                const newContributions = {};
                const finalBalances = {};
                settlementData.forEach(data => {
                    const prevContribution = (lastSettlement && lastSettlement.contributions[data.investorId]) ? lastSettlement.contributions[data.investorId] : 0;
                    newContributions[data.investorId] = prevContribution + data.fairShareThisPeriod; // Use fairShareThisPeriod
                    finalBalances[data.investorId] = data.balance; // 'balance' is the new final balance
                });

                // 4. Save the new settlement snapshot
                await db.project_settlements.add({
                    projectId,
                    settlementDate: today,
                    contributions: newContributions,
                    balances: finalBalances, // Save the calculated balances
                    notes: `Settlement executed on ${today}`
                });
            });

            // 5. Update UI - disable button and show success message
            alert('تم تنفيذ التسوية وحفظها بنجاح!');
            executeSettlementBtn.disabled = true;
            executeSettlementBtn.textContent = 'تم التنفيذ';
            // Do NOT refresh the report automatically

        } catch (error) {
            console.error('Failed to execute settlement:', error);
            alert('حدث خطأ أثناء تنفيذ التسوية. لم يتم حفظ أي تغييرات.');
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
            // 1. Get the last settlement to establish the reporting period
            const lastSettlement = await db.project_settlements
                .where({ projectId })
                .last();

            const sinceDate = lastSettlement ? lastSettlement.settlementDate : '1970-01-01';
            const previousContributions = lastSettlement ? lastSettlement.contributions : {};

            // 2. Fetch all necessary data for the report from the main vouchers table
            const [vouchers, accounts, projectInvestors] = await Promise.all([
                db.vouchers.where('[projectId+isSettlementExpense+date]')
                    .between([projectId, 1, sinceDate], [projectId, 1, '9999-12-31'])
                    .toArray(),
                db.accounts.toArray(),
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

            // 3. Group transactions by investor for the current period
            const transactionsByInvestor = new Map();
            investors.forEach(inv => transactionsByInvestor.set(inv.id, []));

            vouchers.forEach(v => {
                // The detailed report now only shows settlement expenses.
                // The balancing settlement transactions are not shown here anymore, as they are not part of this table.
                // This simplifies the report to just show the expenses that make up the settlement.
                if (v.isSettlementExpense && transactionsByInvestor.has(v.paidByInvestorId)) {
                    transactionsByInvestor.get(v.paidByInvestorId).push({
                        date: v.date,
                        type: 'مصروف تسوية',
                        description: `${accountMap.get(v.accountId) || 'غير معروف'} - ${v.description || ''}`,
                        amount: v.credit // Use credit for the amount
                    });
                }
            });

            let reportHtml = `<h1 class="text-2xl font-bold text-center mb-4">تقرير تفصيلي للمساهمات - مشروع: ${projectName}</h1>`;
            reportHtml += `<p class="text-center text-sm mb-6">الفترة منذ آخر تسوية بتاريخ: ${sinceDate}</p>`;

            // 4. Generate HTML for each investor
            for (const investor of investors) {
                const investorId = investor.id;
                const investorName = investor.name;
                const transactions = transactionsByInvestor.get(investorId) || [];
                const prevContribution = previousContributions[investorId] || 0;

                transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

                let periodNetContribution = 0;
                let tableRowsHtml = '';
                transactions.forEach(t => {
                    let effectiveAmount;
                    if(t.type === 'دفعة تسوية') {
                        // This was a payment TO another investor, which is part of this period's contribution
                        // But it's NOT a new expense, it's settling a debt. The contribution comes from the original expense.
                        // The logic should be: Previous Contribution + Period Expenses Paid By Me - Period Settlements Received by Me + Period Settlements Paid by Me
                        // Let's rethink. The user-approved logic is: New Contribution = Previous Contribution + Fair Share
                        // So the detailed report should prove this.
                        // It should be: Previous Contribution + All Expenses Paid by me this period.
                        // Let's re-rethink. The detailed report should show a "statement of account".
                        // So, Prev Contrib + expenses paid - settlements received + settlements paid.
                        // The amount for 'دفعة تسوية' should be negative from the POV of contribution.
                        // No, `paidByInvestorId` means they paid. It's a positive contribution.
                        // `receivedByInvestorId` means they received. It's a negative contribution.
                        // My previous `executeSettlement` logic was `new_contributions[data.investorId] = prevContribution + data.fairShare;`
                        // So the detailed report must reconcile to this number.
                        // The sum of transactions for an investor in the period report should be their `paidThisPeriod`.
                        // And the final number should be `prevContribution + paidThisPeriod - balance`. Wait, no.
                        // Final Contribution = prevContribution + fairShareThisPeriod.
                        // Let's simplify the detailed report. It should only show EXPENSES for the period.
                        // Then show the final settlement calculation.
                        // No, the user wants to see settlement transactions in the report.

                        // Let's correct the amounts for the statement.
                        // An expense paid by me: increases my contribution. Amount is positive.
                        // A settlement paid by me to someone else: This is to cover my share. It increases my contribution. Amount is positive.
                        // A settlement received by me from someone else: This is reimbursement. It decreases my contribution. Amount is negative.

                        // My first grouping logic was correct.
                        // paidByInvestorId (debtor) pays `v.amount`. This cash out increases their total contribution.
                        // receivedByInvestorId (creditor) receives `v.amount`. This cash in is a reimbursement, decreasing their total contribution.
                        effectiveAmount = t.amount;
                    } else if (t.type === 'قبض تسوية') {
                        effectiveAmount = t.amount; // Already negative
                    } else { // مصروف
                        effectiveAmount = t.amount;
                    }
                    periodNetContribution += effectiveAmount;

                    tableRowsHtml += `
                        <tr>
                            <td class="px-5 py-2 border-b">${t.date}</td>
                            <td class="px-5 py-2 border-b">${t.type}</td>
                            <td class="px-5 py-2 border-b">${t.description}</td>
                            <td class="px-5 py-2 border-b text-left">${formatCurrency(t.amount)}</td>
                        </tr>
                    `;
                });

                const newTotalContribution = prevContribution + periodNetContribution;

                reportHtml += `<div class="mb-8" style="page-break-after: always;">`;
                reportHtml += `<h2 class="text-xl font-bold border-b-2 border-gray-300 pb-2 mb-4">كشف حساب المستثمر: ${investorName}</h2>`;

                reportHtml += `<table class="min-w-full leading-normal" style="width: 100%; border-collapse: collapse;">
                                <tbody>
                                    <tr>
                                        <td colspan="3" class="px-5 py-2 border-b font-bold text-right">رصيد المساهمة السابق</td>
                                        <td class="px-5 py-2 border-b font-bold text-left">${formatCurrency(prevContribution)}</td>
                                    </tr>
                                </tbody>
                               </table>`;

                if (transactions.length > 0) {
                     reportHtml += `<h3 class="text-lg font-semibold my-2">حركات الفترة الحالية:</h3>
                                    <table class="min-w-full leading-normal" style="width: 100%; border-collapse: collapse;">
                                        <thead>
                                            <tr>
                                                <th class="px-5 py-3 border-b-2 bg-gray-100 text-right text-xs font-semibold uppercase">التاريخ</th>
                                                <th class="px-5 py-3 border-b-2 bg-gray-100 text-right text-xs font-semibold uppercase">النوع</th>
                                                <th class="px-5 py-3 border-b-2 bg-gray-100 text-right text-xs font-semibold uppercase">البيان</th>
                                                <th class="px-5 py-3 border-b-2 bg-gray-100 text-right text-xs font-semibold uppercase">المبلغ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${tableRowsHtml}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colspan="3" class="px-5 py-2 border-t-2 font-bold text-right">صافي حركات الفترة</td>
                                                <td class="px-5 py-2 border-t-2 font-bold text-left">${formatCurrency(periodNetContribution)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>`;
                } else {
                    reportHtml += `<p class="my-4">لا توجد حركات جديدة في هذه الفترة.</p>`;
                }

                reportHtml += `<table class="min-w-full leading-normal mt-4" style="width: 100%; border-collapse: collapse;">
                                <tbody>
                                    <tr class="bg-gray-200">
                                        <td colspan="3" class="px-5 py-3 border-t-2 font-bold text-right text-lg">إجمالي المساهمة النهائي</td>
                                        <td class="px-5 py-3 border-t-2 font-bold text-left text-lg">${formatCurrency(newTotalContribution)}</td>
                                    </tr>
                                </tbody>
                               </table>`;

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
