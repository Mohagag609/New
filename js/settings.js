document.addEventListener('DOMContentLoaded', () => {
    const page = document.getElementById('page-settings');
    if (!page) return;

    const settingsForm = document.getElementById('settings-form');
    const companyNameInput = document.getElementById('company-name-setting');
    const currencyInput = document.getElementById('currency-setting');

    const loadSettings = () => {
        const companyName = localStorage.getItem('companyName');
        const currency = localStorage.getItem('currency') || 'EGP'; // Default to EGP
        if (companyName) {
            companyNameInput.value = companyName;
        }
        currencyInput.value = currency;
    };

    const saveSettings = (event) => {
        event.preventDefault();
        const companyName = companyNameInput.value.trim();
        const currency = currencyInput.value.trim().toUpperCase();

        if (currency.length !== 3) {
            alert('الرجاء إدخال رمز عملة صحيح مكون من 3 أحرف (مثل EGP).');
            return;
        }

        localStorage.setItem('companyName', companyName);
        localStorage.setItem('currency', currency);
        alert('تم حفظ الإعدادات بنجاح!');
    };

    settingsForm.addEventListener('submit', saveSettings);

    // --- Backup & Restore ---
    const exportBtn = document.getElementById('export-data-btn');
    const importBtn = document.getElementById('import-data-btn');
    const importFileInput = document.getElementById('import-file-input');

    const exportData = async () => {
        try {
            alert('سيتم تجهيز ملف التصدير. قد تستغرق العملية بعض الوقت حسب حجم البيانات.');
            const [cashboxes, parties, accounts, vouchers] = await Promise.all([
                db.cashboxes.toArray(),
                db.parties.toArray(),
                db.accounts.toArray(),
                db.vouchers.toArray()
            ]);

            const dataToExport = {
                exportDate: new Date().toISOString(),
                data: {
                    cashboxes,
                    parties,
                    accounts,
                    vouchers
                }
            };

            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `treasury_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error('Failed to export data:', error);
            alert('حدث خطأ أثناء تصدير البيانات.');
        }
    };

    const importData = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (!imported.data || !imported.data.cashboxes || !imported.data.parties) {
                    throw new Error('الملف غير صالح أو لا يحتوي على البنية المتوقعة.');
                }

                const confirmation = confirm('تحذير! سيتم حذف جميع البيانات الحالية واستبدالها بالبيانات من الملف. هل أنت متأكد من المتابعة؟');
                if (!confirmation) {
                    importFileInput.value = ''; // Reset file input
                    return;
                }

                await db.transaction('rw', db.cashboxes, db.parties, db.accounts, db.vouchers, async () => {
                    // Clear all tables
                    await Promise.all([
                        db.cashboxes.clear(),
                        db.parties.clear(),
                        db.accounts.clear(),
                        db.vouchers.clear()
                    ]);
                    // Bulk add new data
                    await Promise.all([
                        db.cashboxes.bulkAdd(imported.data.cashboxes),
                        db.parties.bulkAdd(imported.data.parties),
                        db.accounts.bulkAdd(imported.data.accounts),
                        db.vouchers.bulkAdd(imported.data.vouchers)
                    ]);
                });

                alert('تم استيراد البيانات بنجاح! سيتم إعادة تحميل الصفحة.');
                window.location.reload();

            } catch (error) {
                console.error('Failed to import data:', error);
                alert(`حدث خطأ أثناء استيراد البيانات: ${error.message}`);
            } finally {
                importFileInput.value = ''; // Reset file input
            }
        };
        reader.readAsText(file);
    };

    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importData);

    const factoryResetBtn = document.getElementById('factory-reset-btn');
    const factoryReset = async () => {
        const confirmation1 = confirm('تحذير! هل أنت متأكد أنك تريد حذف جميع البيانات بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.');
        if (!confirmation1) return;

        const confirmation2 = prompt('للتأكيد، يرجى كتابة "مسح" في المربع أدناه:');
        if (confirmation2 !== 'مسح') {
            alert('لم يتم التأكيد. تم إلغاء العملية.');
            return;
        }

        try {
            // This is the robust way to clear all tables in the database
            await db.transaction('rw', db.tables.map(t => t.name), async () => {
                await Promise.all(db.tables.map(table => table.clear()));
            });
            localStorage.clear(); // Also clear settings like company name and currency
            alert('تم مسح جميع البيانات بنجاح. سيتم إعادة تحميل التطبيق.');
            window.location.reload();
        } catch (error) {
            console.error('Failed to clear database:', error);
            alert('حدث خطأ أثناء محاولة مسح البيانات.');
        }
    };
    factoryResetBtn.addEventListener('click', factoryReset);


    document.addEventListener('show', (e) => {
        if (e.detail.pageId === 'page-settings') {
            loadSettings();
        }
    });
});
