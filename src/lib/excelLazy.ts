// Central lazy loaders for the heavy spreadsheet libraries.
// Dynamic imports keep exceljs/xlsx-js-style (~1.8 MB combined) out of the
// initial bundle; each library is fetched on first use and cached in a module
// promise so concurrent calls share a single fetch/parse.

export type ExcelJSModule = typeof import('exceljs');
export type XLSXModule = typeof import('xlsx-js-style');

let exceljsPromise: Promise<ExcelJSModule> | undefined;
let xlsxPromise: Promise<XLSXModule> | undefined;

/** Load exceljs on demand (cached). */
export function loadExcelJS(): Promise<ExcelJSModule> {
  if (!exceljsPromise) {
    exceljsPromise = import('exceljs').then(
      (m) => ((m as { default?: ExcelJSModule }).default ?? m) as ExcelJSModule
    );
  }
  return exceljsPromise;
}

/** Load xlsx-js-style on demand (cached). */
export function loadXLSX(): Promise<XLSXModule> {
  if (!xlsxPromise) {
    xlsxPromise = import('xlsx-js-style').then((m) => m as XLSXModule);
  }
  return xlsxPromise;
}
