import { useState, useMemo, useCallback } from 'react';
import { useContracts } from '@/hooks/useContracts';
import { useBillingPeriods } from '@/hooks/useBillingPeriods';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog';
import {
  Search,
  FileText,
  Download,
  Calendar,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { Contract, BILLING_PERIOD_LABELS, BillingPeriod, InvoiceDay } from '@/types/contracts';
import { ContractsTableWithMonths } from '@/components/contracts/ContractsTableWithMonths';
import { QuickAddContractForm } from '@/components/contracts/QuickAddContractForm';
import { EditContractForm, type ChangeRecord } from '@/components/contracts/EditContractForm';
import { useToast } from '@/hooks/use-toast';
import { exportMonthlyContractsToExcel } from '@/lib/monthlyExcelExport';
import { getContractsDueThisMonth } from '@/lib/invoiceDateLogic';

type SortField = 'contractNumber' | 'customer' | 'billingPeriod' | 'status' | 'invoiceDay' | 'nextInvoiceDate';
type SortDirection = 'asc' | 'desc';

export default function Contracts() {
  const { contracts, deleteContract, updateContract, stats: contractStats } = useContracts();
  const { allPeriods } = useBillingPeriods();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  // Debounce search term by 300ms to improve performance
  const debouncedSearch = useDebounce(search, 300);

  const [periodFilter, setPeriodFilter] = useState<BillingPeriod | 'all'>('all');
  const [dayFilter, setDayFilter] = useState<InvoiceDay | 'all'>('all');

  const [sortField, setSortField] = useState<SortField>('customer');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [activeTab, setActiveTab] = useState('all');
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDirty, setEditingDirty] = useState(false);
  const [editingChanges, setEditingChanges] = useState<ChangeRecord[]>([]);
  const [showUnsavedAlert, setShowUnsavedAlert] = useState(false);

  // Get contracts due this month
  const dueThisMonth = useMemo(() => getContractsDueThisMonth(contracts), [contracts]);
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const currentMonthNum = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Filter and sort contracts
  const filteredContracts = useMemo(() => {
    let result = [...contracts];

    if (activeTab === 'monthly') {
      result = dueThisMonth.all;
    } else if (activeTab === 'archived') {
      // Show only terminated/archived contracts
      result = result.filter(c => c.status === 'pulled_out' || c.status === 'archived');
    } else {
      // 'all' tab: Show everything EXCEPT archived/pulled_out
      result = result.filter(c => c.status !== 'pulled_out' && c.status !== 'archived');
    }

    // Use debouncedSearch instead of search for filtering
    if (debouncedSearch) {
      const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
      const searchNormalized = normalize(debouncedSearch);

      result = result.filter(c =>
        normalize(c.customer).includes(searchNormalized) ||
        normalize(c.contractNumber).includes(searchNormalized) ||
        normalize(c.machineSite).includes(searchNormalized)
      );
    }

    if (periodFilter !== 'all') {
      result = result.filter(c => c.billingPeriod === periodFilter);
    }

    if (dayFilter !== 'all') {
      result = result.filter(c => c.invoiceDay === dayFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'contractNumber':
          comparison = a.contractNumber.localeCompare(b.contractNumber, undefined, { numeric: true });
          break;
        case 'customer':
          comparison = a.customer.localeCompare(b.customer);
          break;
        case 'billingPeriod':
          comparison = a.billingPeriod.localeCompare(b.billingPeriod);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'invoiceDay':
          comparison = a.invoiceDay - b.invoiceDay;
          break;
        case 'nextInvoiceDate':
          comparison = (a.nextInvoiceDate || '').localeCompare(b.nextInvoiceDate || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [contracts, debouncedSearch, periodFilter, dayFilter, sortField, sortDirection, activeTab, dueThisMonth]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const handleDelete = useCallback((contract: Contract) => {
    if (confirm(`Delete contract ${contract.contractNumber} for ${contract.customer}?`)) {
      deleteContract(contract.id);
      toast({
        title: 'Contract deleted',
        description: `Contract ${contract.contractNumber} has been removed.`,
      });
    }
  }, [deleteContract, toast]);

  const handleUpdateField = useCallback((contractId: string, field: keyof Contract, value: any) => {
    updateContract(contractId, { [field]: value });
    toast({
      title: 'Updated',
      description: `Contract field updated successfully.`,
      duration: 1500,
    });
  }, [updateContract, toast]);

  const handleRowClick = useCallback((contract: Contract) => {
    setEditingContract(contract);
  }, []);

  const handleDirtyChange = useCallback((isDirty: boolean, changes: ChangeRecord[]) => {
    setEditingDirty(isDirty);
    setEditingChanges(changes);
  }, []);

  return (
    <div className="space-y-6">
      {/* Enhanced Header Design */}
      <div className="flex flex-col gap-4 pb-2 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text tracking-tight">Contracts</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your rental agreements and billing schedules.
            </p>
          </div>
          <Badge variant="secondary" className="px-3 py-1 text-sm h-7">
            {contractStats.total} Total
          </Badge>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-end gap-3 mt-1">
          <Button
            variant="outline"
            onClick={() => setShowAddForm(true)}
            className="hover:bg-primary/10 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2 text-primary" />
            New Contract
          </Button>

          <Button
            variant="default"
            className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-lg shadow-primary/20"
            onClick={() => {
              const { count, filename } = exportMonthlyContractsToExcel(contracts, currentMonthNum, currentYear, allPeriods);
              toast({ title: 'Export complete', description: `${count} contracts exported to ${filename}` });
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Due in {currentMonth}
          </Button>
        </div>
      </div>

      {/* Add Contract Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto z-[100]">
          <DialogHeader>
            <DialogTitle>Add New Contract</DialogTitle>
          </DialogHeader>
          <QuickAddContractForm onSuccess={() => setShowAddForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-3 flex-wrap">
          <TabsList className="h-auto flex flex-wrap">
            <TabsTrigger value="all" className="gap-1.5 text-xs h-7 px-3">
              <FileText className="h-3.5 w-3.5" />
              All
            </TabsTrigger>
            <TabsTrigger value="monthly" className="gap-1.5 text-xs h-7 px-3">
              <Calendar className="h-3.5 w-3.5" />
              Due This Month
              {dueThisMonth.all.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1">{dueThisMonth.all.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Inline Filters */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1 w-full min-w-[150px] max-w-[280px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as any)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                {Object.entries(BILLING_PERIOD_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{key}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dayFilter as any} onValueChange={(v) => setDayFilter(v === 'all' ? 'all' : parseInt(v) as InvoiceDay)}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                <SelectItem value="5">5th</SelectItem>
                <SelectItem value="15">15th</SelectItem>
                <SelectItem value="25">25th</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Monthly Summary - compact */}
        {activeTab === 'monthly' && (
          <div className="flex gap-3 mt-2">
            <div className="flex-1 p-2 rounded-lg bg-muted/30 text-center">
              <div className="text-lg font-bold text-primary">{dueThisMonth.day5.length}</div>
              <div className="text-[10px] text-muted-foreground">5th</div>
            </div>
            <div className="flex-1 p-2 rounded-lg bg-muted/30 text-center">
              <div className="text-lg font-bold text-primary">{dueThisMonth.day15.length}</div>
              <div className="text-[10px] text-muted-foreground">15th</div>
            </div>
            <div className="flex-1 p-2 rounded-lg bg-muted/30 text-center">
              <div className="text-lg font-bold text-primary">{dueThisMonth.day25.length}</div>
              <div className="text-[10px] text-muted-foreground">25th</div>
            </div>
          </div>
        )}

        {/* Contracts Table - maximized */}
        <TabsContent value="all" className="mt-1">
          {filteredContracts.length > 0 ? (
            <Card className="glass-panel overflow-hidden animate-slide-up [animation-delay:200ms]">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
              <ContractsTableWithMonths
                data={filteredContracts}
                onUpdateField={handleUpdateField}
                onRowClick={handleRowClick}
                onSort={(field) => handleSort(field as SortField)}
                sortField={sortField}
                sortDirection={sortDirection}
              />
            </Card>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {contracts.length === 0
                  ? 'Import Excel or add contracts to get started.'
                  : 'No contracts match your filters.'}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="monthly" className="mt-1">
          {filteredContracts.length > 0 ? (
            <Card className="glass-panel overflow-hidden animate-slide-up [animation-delay:200ms]">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-warning/50 via-warning to-warning/50" />
              <ContractsTableWithMonths
                data={filteredContracts}
                onUpdateField={handleUpdateField}
                onRowClick={handleRowClick}
                onSort={(field) => handleSort(field as SortField)}
                sortField={sortField}
                sortDirection={sortDirection}
              />
            </Card>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No contracts due for {currentMonth}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Contract Dialog */}
      <Dialog open={!!editingContract} onOpenChange={(open) => {
        // Debug opening state
        console.log('Dialog onOpenChange:', open, 'dirty:', editingDirty);
        if (!open) {
          if (editingDirty) {
            // If dirty, show alert and KEEP DIALOG OPEN
            console.log('Preventing close due to dirty state');
            setShowUnsavedAlert(true);
            return;
          }
          console.log('Closing dialog');
          setEditingContract(null);
        }
      }}>
        {/* Strict Modal: Prevent outside click close ALWAYS */}
        <DialogContent
          className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto"
          onInteractOutside={(e) => {
            e.preventDefault();
            console.log('Interact outside prevented');
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit Contract: {editingContract?.contractNumber}</DialogTitle>
          </DialogHeader>
          {editingContract && (
            <EditContractForm
              contract={editingContract}
              onSuccess={() => setEditingContract(null)}
              onDelete={() => {
                handleDelete(editingContract);
                setEditingContract(null);
              }}
              onDirtyChange={handleDirtyChange}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Alert */}
      <AlertDialog open={showUnsavedAlert} onOpenChange={setShowUnsavedAlert}>
        <AlertDialogContent className="sm:max-w-[600px] z-[200]">
          <AlertDialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Unsaved Changes Detected
            </DialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <p>You have unsaved changes. Closing this window will discard them.</p>

                <div className="border rounded-md overflow-hidden text-sm bg-background">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-xs uppercase text-muted-foreground">Field</th>
                        <th className="px-3 py-2 text-left font-medium text-xs uppercase text-muted-foreground">Original</th>
                        <th className="px-3 py-2 text-left font-medium text-xs uppercase text-primary">Changed To</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {editingChanges.map((change, i) => (
                        <tr key={i} className="hover:bg-muted/20">
                          <td className="px-3 py-2 font-medium">{change.label}</td>
                          <td className="px-3 py-2 text-muted-foreground line-through opacity-70 text-xs">{change.oldValue}</td>
                          <td className="px-3 py-2 text-primary font-medium bg-primary/5">{change.newValue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-sm text-muted-foreground">Do you want to discard these changes?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedAlert(false)}>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setEditingContract(null);
                setEditingDirty(false);
                setShowUnsavedAlert(false);
              }}
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
