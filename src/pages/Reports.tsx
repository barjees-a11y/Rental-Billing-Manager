import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useContracts } from '@/hooks/useContracts';
import { useBillingPeriods } from '@/hooks/useBillingPeriods';
import {
  Download,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  Monitor,
  Columns3,
} from 'lucide-react';
import { BILLING_PERIOD_LABELS, ContractCategory, getContractCategory } from '@/types/contracts';
import { useToast } from '@/hooks/use-toast';
import { getContractsDueThisMonth } from '@/lib/invoiceDateLogic';
import { MONTH_NAMES } from '@/lib/billingPeriodColors';
import { exportMonthlyContractsToExcel, getAvailableYears, getContractsDueInMonth } from '@/lib/monthlyExcelExport';
import { exportTopCustomersToExcel } from '@/lib/excelExport';
import { InstallationReport } from '@/components/reports/InstallationReport';
import { InstallationReportTable } from '@/components/reports/InstallationReportTable';

// Stable identifiers matching the export headers in monthlyExcelExport.ts
const EXPORT_COLUMNS = [
  'SI No',
  'Contract#',
  'Customer',
  'Machine/Site',
  'Period',
  'Invoice Day',
  'Billing Schedule',
  'JAN-FEB-MAR',
  'APR-MAY-JUN',
  'JUL-AUG-SEP',
  'OCT-NOV-DEC',
  'Brand',
  'Model',
  'Serial No',
  'Notes',
] as const;

const EXCLUDED_COLUMNS_STORAGE_KEY = 'reportExcludedColumns';

function loadExcludedColumns(): string[] {
  try {
    const raw = localStorage.getItem(EXCLUDED_COLUMNS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c) => EXPORT_COLUMNS.includes(c)) : [];
  } catch {
    return [];
  }
}

export default function Reports() {
  const { contracts, copierStats, otherStats } = useContracts();
  const { allPeriods } = useBillingPeriods();
  const { toast } = useToast();

  const [category, setCategory] = useState<ContractCategory>('copier');

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [excludedColumns, setExcludedColumns] = useState<string[]>(loadExcludedColumns);

  const availableYears = useMemo(() => getAvailableYears(), []);

  const categoryContracts = useMemo(
    () => contracts.filter((c) => getContractCategory(c) === category),
    [contracts, category],
  );

  const contractsDueInSelectedMonth = useMemo(
    () => getContractsDueInMonth(categoryContracts, selectedMonth, selectedYear),
    [categoryContracts, selectedMonth, selectedYear],
  );

  const toggleExcludedColumn = (column: string, checked: boolean) => {
    setExcludedColumns((prev) => {
      const next = checked ? [...prev, column] : prev.filter((c) => c !== column);
      try {
        localStorage.setItem(EXCLUDED_COLUMNS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage unavailable (private mode etc.) — selection just won't persist
      }
      return next;
    });
  };

  const handleExportMonthly = async () => {
    const { count, filename } = await exportMonthlyContractsToExcel(
      categoryContracts,
      selectedMonth,
      selectedYear,
      allPeriods,
      excludedColumns,
    );
    if (count === 0) {
      toast({
        title: 'No contracts',
        description: `No contracts are due in ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Export complete',
        description: `${count} contracts exported to ${filename}${excludedColumns.length > 0 ? ` (${excludedColumns.length} column${excludedColumns.length === 1 ? '' : 's'} excluded)` : ''}`,
      });
    }
  };

  // Group contracts by customer (matching Contracts tab: not pulled_out or archived)
  // Normalize strings so "Company A" and "COMPANY a" count as the same entity
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  const customerStats = categoryContracts
    .filter(c => c.status !== 'pulled_out' && c.status !== 'archived')
    .reduce((acc, c) => {
      const normalizedKey = normalize(c.customer);

      // If we haven't seen this normalized version before, initialize it with the current display name
      if (!acc[normalizedKey]) {
        acc[normalizedKey] = { displayName: c.customer, count: 0 };
      }

      acc[normalizedKey].count++;
      return acc;
    }, {} as Record<string, { displayName: string, count: number }>);

  const topCustomers = Object.values(customerStats)
    .map(data => ({ customer: data.displayName, count: data.count }))
    .filter(c => c.count >= 2)
    .sort((a, b) => b.count - a.count);

  const handleExportTopCustomers = () => {
    const { count, filename } = exportTopCustomersToExcel(topCustomers);
    if (count === 0) {
      toast({
        title: 'No customers',
        description: 'No customers with 2 or more active contracts found.',
        variant: 'destructive'
      });
    } else {
      toast({ title: 'Export complete', description: `${count} customers exported to ${filename}` });
    }
  };

  // Contracts due this month
  const dueThisMonth = getContractsDueThisMonth(categoryContracts);
  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const categoryStats = category === 'copier' ? copierStats : otherStats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text">Reports & Export</h1>
        <p className="text-muted-foreground mt-1">
          Generate reports and export your data
        </p>
      </div>

      {/* Category Tabs */}
      <Tabs
        value={category}
        onValueChange={(v) => setCategory(v as ContractCategory)}
      >
        <TabsList>
          <TabsTrigger value="copier" className="gap-2">
            <FileText className="h-4 w-4" />
            Copier Rental Contracts
            <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1">
              {copierStats.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="other" className="gap-2">
            <Monitor className="h-4 w-4" />
            Other Contracts
            <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1">
              {otherStats.total}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="copier" className="mt-4 space-y-6">
          {renderCategoryContent()}
        </TabsContent>

        <TabsContent value="other" className="mt-4 space-y-6">
          {renderCategoryContent()}
        </TabsContent>
      </Tabs>
    </div>
  );

  function renderCategoryContent() {
    return (
      <>
        {/* Export by Month */}
        <Card className="glass-card hover:border-primary/30 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Monthly Contracts Export</CardTitle>
                <CardDescription>Export contracts due in a specific month</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Month:</span>
                <Select
                  value={String(selectedMonth)}
                  onValueChange={(v) => setSelectedMonth(parseInt(v))}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, idx) => (
                      <SelectItem key={idx} value={String(idx + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Year:</span>
                <Select
                  value={String(selectedYear)}
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger className="w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Exclude columns multi-select */}
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Columns3 className="h-4 w-4" />
                      Exclude columns
                      {excludedColumns.length > 0 && (
                        <Badge variant="secondary" className="h-4 text-[10px] px-1">
                          {excludedColumns.length}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" style={{ zIndex: 10000 }} align="start">
                    <div className="space-y-1">
                      {EXPORT_COLUMNS.map((column) => (
                        <label
                          key={column}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={excludedColumns.includes(column)}
                            onCheckedChange={(checked) => toggleExcludedColumn(column, checked === true)}
                          />
                          <span>{column}</span>
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="text-sm text-muted-foreground">
                {contractsDueInSelectedMonth.length} contracts due
              </div>

              <Button onClick={handleExportMonthly}>
                <Download className="h-4 w-4 mr-2" />
                Export {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Schedule */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Invoice Schedule - {currentMonth}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/30 text-center">
                <div className="text-2xl font-bold text-primary">{dueThisMonth.day5.length}</div>
                <div className="text-sm text-muted-foreground">5th of Month</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 text-center">
                <div className="text-2xl font-bold text-primary">{dueThisMonth.day15.length}</div>
                <div className="text-sm text-muted-foreground">15th of Month</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 text-center">
                <div className="text-2xl font-bold text-primary">{dueThisMonth.day25.length}</div>
                <div className="text-sm text-muted-foreground">25th of Month</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Billing Period Breakdown */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Contracts by Billing Period
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(categoryStats.byPeriod).map(([period, count]) => (
                  <div key={period} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{period}</span>
                      <span className="text-sm text-muted-foreground">
                        {BILLING_PERIOD_LABELS[period as keyof typeof BILLING_PERIOD_LABELS]}
                      </span>
                    </div>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
                {Object.keys(categoryStats.byPeriod).length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No contracts yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card className="glass-card flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Top Customers
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportTopCustomers} className="h-8 md:flex hidden gap-1">
                <Download className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={handleExportTopCustomers} className="md:hidden h-8 w-8">
                <Download className="h-4 w-4 text-primary" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden flex flex-col pt-0">
              <div className="space-y-3 overflow-y-auto pr-2 max-h-[350px]">
                {topCustomers.map((customer, index) => (
                  <div
                    key={customer.customer}
                    className="flex items-center justify-between md:p-0 p-3 md:bg-transparent bg-white dark:bg-card md:shadow-none shadow-sm md:rounded-none rounded-lg md:border-none border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      <span className="truncate max-w-[180px] sm:max-w-[220px] font-semibold md:font-normal text-gray-900 dark:text-gray-100" title={customer.customer}>
                        {customer.customer}
                      </span>
                    </div>
                    <span className="shrink-0 font-bold text-sm md:text-base md:bg-transparent md:text-foreground md:px-0 md:py-0 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                      {customer.count} contracts
                    </span>
                  </div>
                ))}
                {topCustomers.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No customers with multiple contracts yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Installation Report — Cancelled Contracts */}
        <InstallationReport contracts={categoryContracts} />

        {/* Installation Report — Full Contract View */}
        <InstallationReportTable contracts={categoryContracts} />

        {/* Contract Summary */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Contract Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">Total Contracts</p>
                <p className="text-2xl font-bold">{categoryStats.total}</p>
              </div>
              <div className="p-4 rounded-lg bg-success/10">
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-success">{categoryStats.active}</p>
              </div>
              <div className="p-4 rounded-lg bg-warning/10">
                <p className="text-sm text-muted-foreground">Due This Month</p>
                <p className="text-2xl font-bold text-warning">{dueThisMonth.all.length}</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10">
                <p className="text-sm text-muted-foreground">Unique Customers</p>
                <p className="text-2xl font-bold text-primary">{Object.keys(customerStats).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }
}
