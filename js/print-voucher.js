document.addEventListener('DOMContentLoaded', () => {
    // Tafqeet (number to words) - Extended Implementation
    // This is a best-effort implementation for numbers up to 1,000,000.
    // It may not be 100% grammatically perfect for all edge cases.
    function tafqeet(number) {
        if (number === 0) return "صفر";
        if (number > 1000000) return `(التفقيط حتى المليون فقط) - ${number}`;

        const units = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
        const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
        const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
        const hundreds = ["", "مئة", "مئتان", "ثلاثمئة", "أربعمئة", "خمسمئة", "ستمئة", "سبعمئة", "ثمانمئة", "تسعمئة"];

        function convertChunk(num) {
            if (num === 0) return "";
            if (num > 999) return ""; // This function handles up to 999

            let words = [];
            let h = Math.floor(num / 100);
            if (h > 0) {
                words.push(hundreds[h]);
                num %= 100;
            }

            if (num > 0) {
                if (words.length > 0) words.push("و");
                if (num < 10) {
                    words.push(units[num]);
                } else if (num < 20) {
                    words.push(teens[num - 10]);
                } else {
                    let u = num % 10;
                    let t = Math.floor(num / 10);
                    if (u > 0) {
                        words.push(units[u]);
                        words.push("و");
                    }
                    words.push(tens[t]);
                }
            }
            return words.join(" ");
        }

        if (number === 1000000) return "مليون";

        let allWords = [];
        let millionPart = Math.floor(number / 1000000);
        let thousandPart = Math.floor((number % 1000000) / 1000);
        let restPart = number % 1000;

        if (thousandPart > 0) {
            if (thousandPart === 1) allWords.push("ألف");
            else if (thousandPart === 2) allWords.push("ألفان");
            else if (thousandPart >= 3 && thousandPart <= 10) allWords.push(convertChunk(thousandPart) + " آلاف");
            else allWords.push(convertChunk(thousandPart) + " ألفاً");
        }

        if (restPart > 0) {
            if (allWords.length > 0) allWords.push("و");
            allWords.push(convertChunk(restPart));
        }

        return "فقط " + allWords.join(" ") + " لا غير";
    }

    const loadVoucherData = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const voucherId = Number(urlParams.get('id'));

        if (!voucherId) {
            document.body.innerHTML = '<h1>لم يتم العثور على رقم السند.</h1>';
            return;
        }

        try {
            const voucher = await db.vouchers.get(voucherId);
            if (!voucher) {
                document.body.innerHTML = '<h1>السند غير موجود.</h1>';
                return;
            }

            // Fetch related data
            const [party, account] = await Promise.all([
                voucher.partyId ? db.parties.get(voucher.partyId) : Promise.resolve(null),
                voucher.accountId ? db.accounts.get(voucher.accountId) : Promise.resolve(null)
            ]);

            // --- Populate settings ---
            const companyName = localStorage.getItem('companyName');
            if (companyName) {
                document.getElementById('company-name').textContent = companyName;
            }

            // --- Populate voucher fields ---
            const amount = voucher.debit > 0 ? voucher.debit : voucher.credit;

            let title = '';
            switch(voucher.movementType) {
                case 'Receipt': title = 'سند قبض'; break;
                case 'Payment': title = 'سند صرف'; break;
                case 'TransferIn': title = 'سند تحويل وارد'; break;
                case 'TransferOut': title = 'سند تحويل صادر'; break;
            }

            document.getElementById('voucher-title').textContent = title;
            document.getElementById('voucher-no').textContent = voucher.voucherNo;
            document.getElementById('voucher-date').textContent = voucher.date;

            // Using .innerHTML to allow for '---' if data is missing
            document.getElementById('party-name').innerHTML = party ? party.name : '---';
            document.getElementById('account-name').innerHTML = account ? account.name : '---';
            document.getElementById('description').innerHTML = voucher.description || '---';

            const currencyCode = localStorage.getItem('currency') || 'EGP';
            const currencyName = currencyCode === 'EGP' ? 'جنيهاً مصرياً' : currencyCode;

            document.getElementById('currency').textContent = currencyCode;
            document.getElementById('amount-in-numbers').textContent = new Intl.NumberFormat('ar-SA', { style: 'currency', currency: currencyCode }).format(amount);
            document.getElementById('amount-in-words').textContent = tafqeet(amount) + ` ${currencyName}`;

            // Automatically trigger print dialog after a short delay
            setTimeout(() => window.print(), 500);

        } catch (error) {
            console.error('Failed to load voucher data:', error);
            document.body.innerHTML = '<h1>حدث خطأ أثناء تحميل بيانات السند.</h1>';
        }
    };

    loadVoucherData();
});
