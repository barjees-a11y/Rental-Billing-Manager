import XLSX from 'xlsx-js-style';

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
    ['Header 1', 'Header 2'],
    ['Data 1', 'Data 2'],
    ['Data 3', 'Data 4'],
]);

// Test 1: !views (what we have)
ws['!views'] = [{ state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomRight' }];
XLSX.utils.book_append_sheet(wb, ws, 'Views');

// Test 2: !freeze object
const ws2 = XLSX.utils.aoa_to_sheet([['H1', 'H2'], ['D1', 'D2']]);
ws2['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomRight', state: 'frozen' };
XLSX.utils.book_append_sheet(wb, ws2, 'FreezeObj');

// Test 3: !views array with paning
const ws3 = XLSX.utils.aoa_to_sheet([['H1', 'H2'], ['D1', 'D2']]);
ws3['!views'] = [{ pane: { state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomRight' } }];
XLSX.utils.book_append_sheet(wb, ws3, 'ViewsPane');

XLSX.writeFile(wb, 'test-freeze.xlsx');
console.log('Test file written');
