import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import XLSX from 'xlsx-js-style';
import { useContracts } from '@/hooks/useContracts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';
import { Contract, BillingPeriod, InvoiceDay, QuarterlyMonths } from '@/types/contracts';
import { useToast } from '@/hooks/use-toast';

interface ParsedContract {
  contractNumber: string;
  customer: string;
  machineSite: string;
  billingPeriod: BillingPeriod;
  invoiceDay: InvoiceDay;
  quarterlyMonths?: QuarterlyMonths;
  rentalFee: number;
  isValid: boolean;
  errors: string[];
}

export default function ImportExcel() {
  const { importContracts, contracts } = useContracts();
  const { toast } = useToast();

  const [parsedData, setParsedData] = useState<ParsedContract[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const parseExcelFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Use first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

      console.log('Sheet name:', sheetName);
      console.log('Total rows:', jsonData.length);
      console.log('First few rows:', jsonData.slice(0, 5));

      // Find header row by looking for "Contract" keyword
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

      console.log('Header row index:', headerRowIndex);
      console.log('Header row:', jsonData[headerRowIndex]);

      // Get headers and normalize them
      const headerRow = jsonData[headerRowIndex] || [];
      const headers = headerRow.map(h => String(h ?? '').toLowerCase().trim());

      console.log('Parsed headers:', headers);

      // Find column indices based on your Excel structure
      // Your Excel has: [row#, Contract#, Customer/Machine, Period, Invoice Day, Q1, Q2, Q3, Q4]
      const findColIndex = (keywords: string[]) => {
        const idx = headers.findIndex(h =>
          h && keywords.some(kw => h.includes(kw))
        );
        return idx;
      };

      // Detect column positions
      let contractCol = findColIndex(['contract']);
      let customerCol = findColIndex(['customer', 'client', 'machine']);
      let periodCol = findColIndex(['period']);
      let dayCol = findColIndex(['day', 'inv']);
      let feeCol = findColIndex(['fee', 'rental', 'amount', 'rate']);

      // Find quarterly month columns (Q1, Q2, Q3, Q4 or JAN, APR, etc.)
      let q1Col = findColIndex(['jan', 'q1', 'feb', 'mar']);
      let q2Col = findColIndex(['apr', 'q2', 'may', 'jun', 'june']);
      let q3Col = findColIndex(['jul', 'q3', 'aug', 'sep']);
      let q4Col = findColIndex(['oct', 'q4', 'nov', 'dec']);

      console.log('Column mapping:', { contractCol, customerCol, periodCol, dayCol, feeCol, q1Col, q2Col, q3Col, q4Col });

      // Fallback for your specific Excel structure if columns not found
      // Your structure appears to be: Index | Contract# | Customer | Period | Day | Q1 | Q2 | Q3 | Q4
      if (contractCol === -1) contractCol = 1; // Second column (after row number)
      if (customerCol === -1) customerCol = 2; // Third column
      if (periodCol === -1) periodCol = 3;     // Fourth column
      if (dayCol === -1) dayCol = 4;           // Fifth column
      if (q1Col === -1) q1Col = 5;
      if (q2Col === -1) q2Col = 6;
      if (q3Col === -1) q3Col = 7;
      if (q4Col === -1) q4Col = 8;

      // Parse data rows
      const parsed: ParsedContract[] = [];
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];

        // Skip completely empty rows
        if (!row || row.length === 0) continue;
        if (row.every(cell => cell === '' || cell === null || cell === undefined)) continue;

        const errors: string[] = [];

        // Extract values from detected columns
        const contractNumber = String(row[contractCol] ?? '').trim();
        const customerMachine = String(row[customerCol] ?? '').trim();

        // Split customer and machine if there's a separator like " - "
        let customer = customerMachine;
        let machineSite = '';

        // Common patterns: "Company - Machine", "Company -Location"
        const separatorMatch = customerMachine.match(/^(.+?)\s*[-–]\s*(.+)$/);
        if (separatorMatch) {
          customer = separatorMatch[1].trim();
          machineSite = separatorMatch[2].trim();
        }

        // Parse billing period
        let billingPeriodRaw = String(row[periodCol] ?? '').trim().toUpperCase();
        let billingPeriod = billingPeriodRaw;

        const validPeriods = ['MB', 'QB', 'MBQX', 'QBYX', 'YB', 'HY', '2MBX', 'MBYX'];
        if (!validPeriods.includes(billingPeriod)) {
          if (billingPeriod) {
            errors.push(`Unknown period "${billingPeriodRaw}", defaulting to MB`);
          }
          billingPeriod = 'MB';
        }

        // Parse invoice day
        // Parse invoice day from Excel column
        let invoiceDay = parseInt(String(row[dayCol] ?? '15').replace(/[^0-9]/g, ''));

        // Validation/Fallback
        if (isNaN(invoiceDay)) {
          invoiceDay = 15; // Default if completely unparseable
          errors.push(`Invalid invoice day "${row[dayCol]}", defaulting to 15th`);
        } else if (![5, 15, 25].includes(invoiceDay)) {
          // Snap to nearest valid day logic
          if (invoiceDay >= 1 && invoiceDay <= 10) invoiceDay = 5;
          else if (invoiceDay >= 11 && invoiceDay <= 20) invoiceDay = 15;
          else invoiceDay = 25;
        }

        // Parse quarterly months from Q1-Q4 columns
        let quarterlyMonths: QuarterlyMonths | undefined;
        const q1Val = String(row[q1Col] ?? '').toUpperCase().trim();
        const q2Val = String(row[q2Col] ?? '').toUpperCase().trim();
        const q3Val = String(row[q3Col] ?? '').toUpperCase().trim();
        const q4Val = String(row[q4Col] ?? '').toUpperCase().trim();

        // Determine quarterly schedule based on values
        if (q1Val || q2Val || q3Val || q4Val) {
          if (q1Val.includes('JAN') || q2Val.includes('APR') || q3Val.includes('JUL') || q4Val.includes('OCT')) {
            quarterlyMonths = 'JAN-APR-JUL-OCT';
          } else if (q1Val.includes('FEB') || q2Val.includes('MAY') || q3Val.includes('AUG') || q4Val.includes('NOV')) {
            quarterlyMonths = 'FEB-MAY-AUG-NOV';
          } else if (q1Val.includes('MAR') || q2Val.includes('JUN') || q3Val.includes('SEP') || q4Val.includes('DEC')) {
            quarterlyMonths = 'MAR-JUN-SEP-DEC';
          }
        }

        // MB period doesn't use quarterlyMonths - clear it to prevent sorting/display issues
        if (billingPeriod === 'MB') {
          quarterlyMonths = undefined;
        }

        // Parse rental fee if column exists
        let rentalFee = 0;
        if (feeCol !== -1 && row[feeCol]) {
          rentalFee = parseFloat(String(row[feeCol]).replace(/[^0-9.-]/g, ''));
          if (isNaN(rentalFee)) rentalFee = 0;
        }

        // Validation - only add if we have meaningful data
        if (!contractNumber && !customer) continue; // Skip truly empty rows

        if (!contractNumber) errors.push('Missing contract number');
        if (!customer && !customerMachine) errors.push('Missing customer name');

        const isValid = errors.length === 0 && !!contractNumber && !!(customer || customerMachine);

        parsed.push({
          contractNumber: contractNumber || `ROW-${i}`,
          customer: customer || customerMachine || 'Unknown Customer',
          machineSite: machineSite || customerMachine || 'N/A',
          billingPeriod: billingPeriod as BillingPeriod,
          invoiceDay: invoiceDay as InvoiceDay,
          quarterlyMonths,
          rentalFee,
          isValid,
          errors,
        });
      }

      setParsedData(parsed);

      if (parsed.length === 0) {
        toast({
          title: 'No data found',
          description: 'Could not find any valid contract data in the file.',
          variant: 'destructive',
        });
      } else {
        const valid = parsed.filter(p => p.isValid).length;
        toast({
          title: 'File parsed successfully',
          description: `Found ${parsed.length} contracts (${valid} valid, ${parsed.length - valid} with issues).`,
        });
      }
    } catch (error) {
      console.error('Excel parse error:', error);
      toast({
        title: 'Parse error',
        description: 'Failed to parse the Excel file. Please check the format.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      parseExcelFile(file);
    }
  }, [parseExcelFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  const handleImport = async () => {
    const validContracts = parsedData.filter(p => p.isValid);
    if (validContracts.length === 0) {
      toast({
        title: 'No valid contracts',
        description: 'Please fix the errors before importing.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    try {
      const contractsToImport = validContracts.map(p => ({
        contractNumber: p.contractNumber,
        customer: p.customer,
        machineSite: p.machineSite,
        billingPeriod: p.billingPeriod,
        invoiceDay: p.invoiceDay,
        quarterlyMonths: p.quarterlyMonths,
        rentalFee: p.rentalFee,
        excessCountBW: 0,
        excessCountClr: 0,
        excessRateBW: 0.50,
        excessRateClr: 2.00,
        // Set start date to 1st of current month so past-due invoices (e.g. 5th) are valid
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        status: 'active' as const,
      }));

      const imported = importContracts(contractsToImport);

      toast({
        title: 'Import successful',
        description: `${imported} contracts have been imported/updated.`,
      });

      // Clear parsed data
      setParsedData([]);
      setFileName(null);
    } catch (error) {
      toast({
        title: 'Import failed',
        description: 'Something went wrong during import.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClear = () => {
    setParsedData([]);
    setFileName(null);
  };

  const validCount = parsedData.filter(p => p.isValid).length;
  const errorCount = parsedData.length - validCount;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text">Import Excel</h1>
        <p className="text-muted-foreground mt-1">
          Upload your billing spreadsheet to import contracts
        </p>
      </div>

      {/* Upload Zone */}
      <Card className="glass-panel animate-slide-up [animation-delay:200ms]">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
        <CardContent className="pt-8 pb-8">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
              transition-all duration-300 relative overflow-hidden group
              ${isDragActive
                ? 'border-primary bg-primary/10 shadow-[0_0_30px_hsl(var(--primary)/0.2)]'
                : 'border-white/10 hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)]'
              }
              ${isLoading ? 'pointer-events-none opacity-50' : ''}
            `}
          >
            <input {...getInputProps()} />

            {isLoading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-lg font-medium">Parsing file...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="p-4 rounded-full bg-primary/10 mb-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <p className="text-lg font-medium mb-2">
                  {isDragActive ? 'Drop your file here' : 'Drag & drop your Excel file'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to browse (.xlsx, .xls)
                </p>
                <Button variant="outline" size="sm">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Select File
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Parsed Data Preview */}
      {parsedData.length > 0 && (
        <>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Preview: {fileName}</CardTitle>
                <CardDescription>
                  {validCount} valid contracts, {errorCount} with issues
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClear}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
                <Button onClick={handleImport} disabled={validCount === 0 || isImporting}>
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Import {validCount} Contracts
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Status</TableHead>
                      <TableHead>Contract #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Machine/Site</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead className="text-right">Fee</TableHead>
                      <TableHead>Issues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((contract, index) => (
                      <TableRow key={index} className={!contract.isValid ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          {contract.isValid ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{contract.contractNumber || '-'}</TableCell>
                        <TableCell>{contract.customer || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{contract.machineSite}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{contract.billingPeriod}</Badge>
                        </TableCell>
                        <TableCell>{contract.invoiceDay}th</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(contract.rentalFee)}
                        </TableCell>
                        <TableCell>
                          {contract.errors.length > 0 && (
                            <span className="text-xs text-destructive">
                              {contract.errors.join(', ')}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Import Summary */}
          <Card className="glass-card">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="default" className="text-sm">
                    {validCount} ready to import
                  </Badge>
                  {errorCount > 0 && (
                    <Badge variant="destructive" className="text-sm">
                      {errorCount} with issues
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Existing contracts: {contracts.length} • Will update duplicates by contract number
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
