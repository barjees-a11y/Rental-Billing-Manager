import * as XLSX from 'xlsx-js-style';
import fs from 'fs';

async function testParse() {
    const fileBuf = fs.readFileSync('C:\\Users\\SAHARA\\Downloads\\Sahara Copier Rental(Leased Assets Details A+ 2026).xlsx');

    const myXlsx = XLSX.default || XLSX;
    const workbook = myXlsx.read(fileBuf, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = myXlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i];
        if (row && row.some(cell => {
            const cellStr = String(cell ?? '').toLowerCase();
            return cellStr.includes('contract') || cellStr.includes('customer') || cellStr.includes('period');
        })) {
            headerRowIndex = i;
            break;
        }
    }

    const headerRow = jsonData[headerRowIndex] || [];
    const headers = headerRow.map(h => String(h ?? '').toLowerCase().trim());

    const findColIndex = (keywords) => {
        return headers.findIndex(h => h && keywords.some(kw => h.includes(kw)));
    };

    let contractCol = findColIndex(['contract']);
    let customerCol = findColIndex(['customer', 'client', 'machine']);
    let periodCol = findColIndex(['period']);
    let dayCol = findColIndex(['day', 'inv']);
    let feeCol = findColIndex(['fee', 'rental', 'amount', 'rate']);
    let q1Col = findColIndex(['jan', 'q1', 'feb', 'mar']);
    let q2Col = findColIndex(['apr', 'q2', 'may', 'jun', 'june']);
    let q3Col = findColIndex(['jul', 'q3', 'aug', 'sep']);
    let q4Col = findColIndex(['oct', 'q4', 'nov', 'dec']);

    if (contractCol === -1) contractCol = 1;
    if (customerCol === -1) customerCol = 2;
    if (periodCol === -1) periodCol = 3;
    if (dayCol === -1) dayCol = 4;
    if (q1Col === -1) q1Col = 5;
    if (q2Col === -1) q2Col = 6;
    if (q3Col === -1) q3Col = 7;
    if (q4Col === -1) q4Col = 8;

    const validPeriods = ['MB', 'QB', 'MBQX', 'QBYX', 'YB', 'HY', '2MBX', 'MBYX'];

    const parsed = [];
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length === 0) continue;
        if (row.every(cell => cell === '' || cell === null || cell === undefined)) continue;

        const contractNumber = String(row[contractCol] ?? '').trim();
        const customerMachine = String(row[customerCol] ?? '').trim();

        let billingPeriodRaw = String(row[periodCol] ?? '').trim().toUpperCase();
        let billingPeriod = billingPeriodRaw;
        if (!validPeriods.includes(billingPeriod)) {
            billingPeriod = 'MB';
        }

        let invoiceDay = parseInt(String(row[dayCol] ?? '15').replace(/[^0-9]/g, ''));
        if (isNaN(invoiceDay)) {
            invoiceDay = 15;
        } else if (![5, 15, 25].includes(invoiceDay)) {
            if (invoiceDay >= 1 && invoiceDay <= 10) invoiceDay = 5;
            else if (invoiceDay >= 11 && invoiceDay <= 20) invoiceDay = 15;
            else invoiceDay = 25;
        }

        let quarterlyMonths;
        const q1Val = String(row[q1Col] ?? '').toUpperCase().trim();
        const q2Val = String(row[q2Col] ?? '').toUpperCase().trim();
        const q3Val = String(row[q3Col] ?? '').toUpperCase().trim();
        const q4Val = String(row[q4Col] ?? '').toUpperCase().trim();

        if (q1Val || q2Val || q3Val || q4Val) {
            if (q1Val.includes('JAN') || q2Val.includes('APR') || q3Val.includes('JUL') || q4Val.includes('OCT')) {
                quarterlyMonths = 'JAN-APR-JUL-OCT';
            } else if (q1Val.includes('FEB') || q2Val.includes('MAY') || q3Val.includes('AUG') || q4Val.includes('NOV')) {
                quarterlyMonths = 'FEB-MAY-AUG-NOV';
            } else if (q1Val.includes('MAR') || q2Val.includes('JUN') || q3Val.includes('SEP') || q4Val.includes('DEC')) {
                quarterlyMonths = 'MAR-JUN-SEP-DEC';
            }
        }

        if (billingPeriod === 'MB') {
            quarterlyMonths = undefined;
        }

        let rentalFee = 0;
        if (feeCol !== -1 && row[feeCol]) {
            rentalFee = parseFloat(String(row[feeCol]).replace(/[^0-9.-]/g, ''));
            if (isNaN(rentalFee)) rentalFee = 0;
        }

        if (!contractNumber && !customerMachine) continue;

        parsed.push({
            contractNumber,
            customerMachine,
            billingPeriod,
            invoiceDay,
            quarterlyMonths,
            rentalFee,
        });
    }

    // toDbFormat recreation
    const toDbFormat = (contract) => {
        const keyMap = {
            contractNumber: 'contract_number',
            customerMachine: 'customer',
            billingPeriod: 'billing_period',
            invoiceDay: 'invoice_day',
            quarterlyMonths: 'quarterly_months',
            rentalFee: 'rental_fee',
        };
        const dbItem = {};
        Object.keys(contract).forEach((key) => {
            const val = contract[key];
            if (val !== undefined) {
                const dbKey = keyMap[key] || key;
                dbItem[dbKey] = val;
            }
        });
        return dbItem;
    };

    const payload = parsed.map(p => toDbFormat(p)).filter(p => p.quarterly_months).slice(0, 3);
    console.log(JSON.stringify(payload, null, 2));
}

testParse().catch(console.error);
