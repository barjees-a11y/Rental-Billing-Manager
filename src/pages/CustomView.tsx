import { useState, useMemo } from 'react';
import { useContracts } from '@/hooks/useContracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  FileText,
  Download,
} from 'lucide-react';
import { Contract } from '@/types/contracts';
import { ContractsTableWithMonths } from '@/components/contracts/ContractsTableWithMonths';
import { useToast } from '@/hooks/use-toast';
import { MONTH_NAMES } from '@/lib/billingPeriodColors';
import { getContractsDueInMonth, exportMonthlyContractsToExcel, getAvailableYears } from '@/lib/monthlyExcelExport';

export default function CustomView() {
  const { contracts, updateContract, deleteContract } = useContracts();
  const { toast } = useToast();
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  const availableYears = useMemo(() => getAvailableYears(), []);

  // Filter contracts due in selected month
  const filteredContracts = useMemo(() => {
    return getContractsDueInMonth(contracts, selectedMonth, selectedYear);
  }, [contracts, selectedMonth, selectedYear]);

  const handleUpdateField = (contractId: string, field: keyof Contract, value: any) => {
    updateContract(contractId, { [field]: value });
    toast({
      title: 'Updated',
      description: `Contract field updated successfully.`,
      duration: 1500,
    });
  };

  const handleDelete = (contract: Contract) => {
    if (confirm(`Delete contract ${contract.contractNumber} for ${contract.customer}?`)) {
      deleteContract(contract.id);
      toast({
        title: 'Contract deleted',
        description: `Contract ${contract.contractNumber} has been removed.`,
      });
    }
  };

  const handleExport = () => {
    const { count, filename } = exportMonthlyContractsToExcel(contracts, selectedMonth, selectedYear);
    toast({
      title: 'Export complete',
      description: `${count} contracts exported to ${filename}`,
    });
  };

  const monthName = MONTH_NAMES[selectedMonth - 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Custom View</h1>
          <p className="text-muted-foreground mt-1">
            View contracts due for a specific month and year
          </p>
        </div>
      </div>

      {/* Month/Year Selection */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Select Month & Year
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Month:</span>
              <Select 
                value={String(selectedMonth)} 
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger className="w-[140px]">
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
                <SelectTrigger className="w-[100px]">
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

            <div className="flex-1" />

            <Button onClick={handleExport} disabled={filteredContracts.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export {monthName} {selectedYear}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {monthName} {selectedYear} Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <div className="text-2xl font-bold text-primary">{filteredContracts.length}</div>
              <div className="text-sm text-muted-foreground">Total Due</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <div className="text-2xl font-bold text-primary">
                {filteredContracts.filter(c => c.invoiceDay === 5).length}
              </div>
              <div className="text-sm text-muted-foreground">5th Invoice</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <div className="text-2xl font-bold text-primary">
                {filteredContracts.filter(c => c.invoiceDay === 15).length}
              </div>
              <div className="text-sm text-muted-foreground">15th Invoice</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <div className="text-2xl font-bold text-primary">
                {filteredContracts.filter(c => c.invoiceDay === 25).length}
              </div>
              <div className="text-sm text-muted-foreground">25th Invoice</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contracts Table */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Contracts Due in {monthName} {selectedYear}
              <Badge variant="secondary">{filteredContracts.length}</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredContracts.length > 0 ? (
            <ContractsTableWithMonths 
              data={filteredContracts}
              onUpdateField={handleUpdateField}
            />
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg mb-2">No contracts due in {monthName} {selectedYear}</p>
              <p className="text-sm">
                Select a different month or year to view contracts
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
