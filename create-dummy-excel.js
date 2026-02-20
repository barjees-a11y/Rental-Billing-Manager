const ExcelJS = require('exceljs');

async function createDummyExcel() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Contracts');

    sheet.columns = [
        { header: 'Index', key: 'index', width: 10 },
        { header: 'Contract#', key: 'contract', width: 20 },
        { header: 'Customer/Machine', key: 'customer', width: 30 },
        { header: 'Period', key: 'period', width: 15 },
        { header: 'Invoice Day', key: 'day', width: 15 },
        { header: 'Q1', key: 'q1', width: 10 },
        { header: 'Q2', key: 'q2', width: 10 },
        { header: 'Q3', key: 'q3', width: 10 },
        { header: 'Q4', key: 'q4', width: 10 },
    ];

    sheet.addRow({
        index: 1,
        contract: 'CON-001',
        customer: 'Acme Corp - Copier 1',
        period: 'QB',
        day: 15,
        q1: 'JAN',
        q2: 'APR',
        q3: 'JUL',
        q4: 'OCT'
    });

    sheet.addRow({
        index: 2,
        contract: 'CON-002',
        customer: 'Globex - Printer A',
        period: 'MB',
        day: 5,
        q1: '',
        q2: '',
        q3: '',
        q4: ''
    });

    await workbook.xlsx.writeFile('dummy_contracts.xlsx');
    console.log('dummy_contracts.xlsx created');
}

createDummyExcel();
