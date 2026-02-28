import { useState, useEffect, useRef } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useContracts } from '@/hooks/useContracts';
import { useToast } from '@/hooks/use-toast';
import { Contract, BillingPeriod, InvoiceDay, QuarterlyMonths, BILLING_PERIOD_LABELS } from '@/types/contracts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';

export interface ChangeRecord {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

interface EditContractFormProps {
  contract: Contract;
  onSuccess?: () => void;
  onDelete?: () => void;
  onDirtyChange?: (isDirty: boolean, changes: ChangeRecord[]) => void;
}

// Get schedule options based on billing period (same as QuickAddContractForm)
const getScheduleOptions = (billingPeriod: BillingPeriod): { value: string; label: string }[] => {
  switch (billingPeriod) {
    case 'QB':
    case 'MBQX':
    case 'QBYX':
      return [
        { value: 'JAN-APR-JUL-OCT', label: 'JAN-APR-JUL-OCT' },
        { value: 'FEB-MAY-AUG-NOV', label: 'FEB-MAY-AUG-NOV' },
        { value: 'MAR-JUN-SEP-DEC', label: 'MAR-JUN-SEP-DEC' },
      ];
    case 'YB':
    case 'MBYX':
      return [
        { value: 'JAN', label: 'JAN (January)' },
        { value: 'FEB', label: 'FEB (February)' },
        { value: 'MAR', label: 'MAR (March)' },
        { value: 'APR', label: 'APR (April)' },
        { value: 'MAY', label: 'MAY (May)' },
        { value: 'JUN', label: 'JUN (June)' },
        { value: 'JUL', label: 'JUL (July)' },
        { value: 'AUG', label: 'AUG (August)' },
        { value: 'SEP', label: 'SEP (September)' },
        { value: 'OCT', label: 'OCT (October)' },
        { value: 'NOV', label: 'NOV (November)' },
        { value: 'DEC', label: 'DEC (December)' },
      ];
    case 'HY':
      return [
        { value: 'JAN-JUL', label: 'JAN & JUL' },
        { value: 'FEB-AUG', label: 'FEB & AUG' },
        { value: 'MAR-SEP', label: 'MAR & SEP' },
        { value: 'APR-OCT', label: 'APR & OCT' },
        { value: 'MAY-NOV', label: 'MAY & NOV' },
        { value: 'JUN-DEC', label: 'JUN & DEC' },
      ];
    case '2MBX':
      return [
        { value: 'JAN-MAR-MAY-JUL-SEP-NOV', label: 'Odd Months' },
        { value: 'FEB-APR-JUN-AUG-OCT-DEC', label: 'Even Months' },
      ];
    case 'MB':
    default:
      return [];
  }
};

// Get default schedule for a period
const getDefaultSchedule = (period: BillingPeriod): QuarterlyMonths | undefined => {
  switch (period) {
    case 'QB':
    case 'MBQX':
    case 'QBYX':
      return 'JAN-APR-JUL-OCT';
    case 'YB':
    case 'MBYX':
      return 'JAN';
    case 'HY':
      return 'JAN-JUL';
    case '2MBX':
      return 'JAN-MAR-MAY-JUL-SEP-NOV';
    default:
      return undefined;
  }
};

// Get schedule label based on period
const getScheduleLabel = (billingPeriod: BillingPeriod): string => {
  switch (billingPeriod) {
    case 'QB':
    case 'MBQX':
    case 'QBYX':
      return 'Quarterly Schedule';
    case 'YB':
    case 'MBYX':
      return 'Yearly Month';
    case 'HY':
      return 'Half-Yearly Cycle';
    case '2MBX':
      return 'Bi-Monthly Cycle';
    case 'MBYX':
      return 'Yearly Excess Month';
    default:
      return 'Billing Schedule';
  }
};

export function EditContractForm({ contract, onSuccess, onDelete, onDirtyChange }: EditContractFormProps) {
  const { updateContract, terminateContract } = useContracts();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<ChangeRecord[]>([]);

  const [terminationData, setTerminationData] = useState<{
    date: Date | undefined;
    reason: string;
  }>({
    date: undefined,
    reason: ''
  });

  const [formData, setFormData] = useState({
    contractNumber: contract.contractNumber,
    customer: contract.customer,
    machineSite: contract.machineSite,
    billingPeriod: contract.billingPeriod,
    invoiceDay: contract.invoiceDay,
    quarterlyMonths: contract.quarterlyMonths,
    startDate: contract.startDate,
    endDate: contract.endDate || '',
    status: contract.status,
    notes: contract.notes || '',
  });

  // Calculate changes and notify parent
  // Use a ref to track the last emitted changes string to prevent infinite loops
  // because 'changes' array is a new reference every render.
  const lastEmittedChangesRef = useRef<string>('');
  const lastEmittedDirtyRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const changes: ChangeRecord[] = [];

    // Helper to compare and push
    const checkChange = (
      field: keyof typeof formData,
      label: string,
      originalVal: any,
      newVal: any
    ) => {
      const v1 = String(originalVal || '');
      const v2 = String(newVal || '');
      if (v1 !== v2) {
        changes.push({
          field: String(field),
          label,
          oldValue: v1 || '(empty)',
          newValue: v2 || '(empty)'
        });
      }
    };

    checkChange('contractNumber', 'Contract #', contract.contractNumber, formData.contractNumber);
    checkChange('customer', 'Customer', contract.customer, formData.customer);
    checkChange('machineSite', 'Machine/Site', contract.machineSite, formData.machineSite);
    checkChange('billingPeriod', 'Billing Period', contract.billingPeriod, formData.billingPeriod);
    checkChange('invoiceDay', 'Invoice Day', contract.invoiceDay, formData.invoiceDay);
    checkChange('status', 'Status', contract.status, formData.status);
    checkChange('startDate', 'Start Date', contract.startDate, formData.startDate);
    checkChange('endDate', 'End Date', contract.endDate, formData.endDate);
    checkChange('quarterlyMonths', 'Billing Schedule', contract.quarterlyMonths, formData.quarterlyMonths);
    checkChange('notes', 'Notes', contract.notes, formData.notes);

    const isDirty = changes.length > 0;
    const changesString = JSON.stringify(changes);

    const dirtyStatusChanged = isDirty !== lastEmittedDirtyRef.current;

    if (dirtyStatusChanged) {
      console.log('EditContractForm: Dirty status changed to:', isDirty);
      lastEmittedChangesRef.current = changesString;
      lastEmittedDirtyRef.current = isDirty;
      onDirtyChange?.(isDirty, changes);
    } else if (isDirty && lastEmittedChangesRef.current !== changesString) {
      console.log('EditContractForm: Content changed, debouncing...');

      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      debounceTimerRef.current = setTimeout(() => {
        console.log('EditContractForm: Debounce fired, emitting changes');
        lastEmittedChangesRef.current = changesString;
        onDirtyChange?.(isDirty, changes);
      }, 500);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [formData, contract, onDirtyChange]);

  // Reset form when contract changes
  useEffect(() => {
    setFormData({
      contractNumber: contract.contractNumber,
      customer: contract.customer,
      machineSite: contract.machineSite,
      billingPeriod: contract.billingPeriod,
      invoiceDay: contract.invoiceDay,
      quarterlyMonths: contract.quarterlyMonths,
      startDate: contract.startDate,
      endDate: contract.endDate || '',
      status: contract.status,
      notes: contract.notes || '',
    });
  }, [contract]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      updateContract(contract.id, {
        contractNumber: formData.contractNumber,
        customer: formData.customer,
        machineSite: formData.machineSite,
        billingPeriod: formData.billingPeriod,
        invoiceDay: formData.invoiceDay,
        quarterlyMonths: formData.quarterlyMonths,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
      });

      toast({
        title: 'Contract updated',
        description: `Contract ${formData.contractNumber} has been updated.`,
      });

      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update contract. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contractNumber || !formData.customer) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in Contract# and Customer',
        variant: 'destructive',
      });
      return;
    }

    // Check for changes
    // Check for changes
    const changes: ChangeRecord[] = [];
    const checkChange = (label: string, originalVal: any, newVal: any) => {
      const v1 = String(originalVal || '');
      const v2 = String(newVal || '');
      if (v1 !== v2) {
        changes.push({
          field: label, // Using label as field for local display
          label,
          oldValue: v1 || '(empty)',
          newValue: v2 || '(empty)'
        });
      }
    };

    checkChange('Contract #', contract.contractNumber, formData.contractNumber);
    checkChange('Customer', contract.customer, formData.customer);
    checkChange('Machine/Site', contract.machineSite, formData.machineSite);
    checkChange('Billing Period', contract.billingPeriod, formData.billingPeriod);
    checkChange('Invoice Day', contract.invoiceDay, formData.invoiceDay);
    checkChange('Status', contract.status, formData.status);
    checkChange('Start Date', contract.startDate, formData.startDate);
    checkChange('End Date', contract.endDate, formData.endDate);
    checkChange('Billing Schedule', contract.quarterlyMonths, formData.quarterlyMonths);
    checkChange('Notes', contract.notes, formData.notes);

    if (changes.length > 0) {
      setPendingChanges(changes);
      setShowSaveConfirm(true);
    } else {
      // No changes? just save/close
      onSuccess?.();
    }
  };

  const handleTerminate = () => {
    if (!terminationData.date || !terminationData.reason) return;

    try {
      const formattedDate = format(terminationData.date, 'yyyy-MM-dd');
      terminateContract(contract.id, formattedDate, terminationData.reason);
      toast({
        title: 'Contract Terminated',
        description: `Contract ${contract.contractNumber} has been terminated.`,
      });
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to terminate contract.',
        variant: 'destructive',
      });
    }
  };

  const periodNeedsSchedule = formData.billingPeriod !== 'MB';
  const scheduleOptions = getScheduleOptions(formData.billingPeriod);

  return (
    <>
      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Changes</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>You are about to save the following changes:</p>
                <div className="border rounded-md overflow-hidden text-sm">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Field</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Old Value</th>
                        <th className="px-3 py-2 text-left font-medium text-primary">New Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {pendingChanges.map((change, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium">{change.label}</td>
                          <td className="px-3 py-2 text-muted-foreground line-through opacity-70">{change.oldValue}</td>
                          <td className="px-3 py-2 text-primary font-medium">{change.newValue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="font-medium pt-2">Are you sure you want to proceed?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>Confirm & Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <form onSubmit={handlePreSubmit} className="space-y-6">
        {/* Row 1: Contract#, Customer */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contractNumber" className="text-sm mb-1.5 block">Contract#</Label>
            <Input
              id="contractNumber"
              value={formData.contractNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, contractNumber: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="customer" className="text-sm mb-1.5 block">Customer</Label>
            <Input
              id="customer"
              value={formData.customer}
              onChange={(e) => setFormData(prev => ({ ...prev, customer: e.target.value }))}
            />
          </div>
        </div>

        {/* Row 2: Machine/Site, Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="machineSite" className="text-sm mb-1.5 block">Machine/Site</Label>
            <Input
              id="machineSite"
              value={formData.machineSite}
              onChange={(e) => setFormData(prev => ({ ...prev, machineSite: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-sm mb-1.5 block">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as Contract['status'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[999]">
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="pulled_out">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 3: Period, Invoice Day */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm mb-1.5 block">Billing Period</Label>
            <Select
              value={formData.billingPeriod}
              onValueChange={(v) => {
                const newPeriod = v as BillingPeriod;
                setFormData(prev => ({
                  ...prev,
                  billingPeriod: newPeriod,
                  quarterlyMonths: getDefaultSchedule(newPeriod)
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[999]">
                {Object.entries(BILLING_PERIOD_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{key} - {label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm mb-1.5 block">Invoice Day</Label>
            <Select
              value={String(formData.invoiceDay)}
              onValueChange={(v) => setFormData(prev => ({ ...prev, invoiceDay: parseInt(v) as InvoiceDay }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[999]">
                <SelectItem value="5">5th</SelectItem>
                <SelectItem value="15">15th</SelectItem>
                <SelectItem value="25">25th</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 4: Billing Schedule */}
        <div>
          <Label className="text-sm mb-1.5 block">{getScheduleLabel(formData.billingPeriod)}</Label>
          <Select
            value={formData.quarterlyMonths || 'none'}
            onValueChange={(v) => setFormData(prev => ({
              ...prev,
              quarterlyMonths: v === 'none' ? undefined : v as QuarterlyMonths
            }))}
            disabled={!periodNeedsSchedule}
          >
            <SelectTrigger className={!periodNeedsSchedule ? 'opacity-50' : ''}>
              <SelectValue placeholder={periodNeedsSchedule ? 'Select schedule...' : 'All Months (N/A)'} />
            </SelectTrigger>
            <SelectContent className="z-[999]">
              {!periodNeedsSchedule && <SelectItem value="none">All Months</SelectItem>}
              {scheduleOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Row 5: Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate" className="text-sm mb-1.5 block">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="endDate" className="text-sm mb-1.5 block">End Date (Optional)</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="text-sm mb-1.5 block">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any additional notes..."
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-between gap-3 pt-4 border-t border-border/50">
          {onDelete && (
            <div className="flex gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Contract?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete contract <strong>{contract.contractNumber}</strong>. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                      Delete Permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal border-destructive/50 text-destructive hover:bg-destructive/10",
                      !terminationData.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {terminationData.date ? format(terminationData.date, "PPP") : "Terminate In..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-4">
                    <h4 className="font-medium leading-none">Terminate Contract</h4>
                    <p className="text-sm text-muted-foreground">
                      Schedule a termination date and reason.
                    </p>
                    <div className="space-y-2">
                      {/* Date Picker using Calendar */}
                      <div className="flex justify-center border rounded-md p-2">
                        <Calendar
                          mode="single"
                          selected={terminationData.date}
                          onSelect={(date) => setTerminationData(prev => ({ ...prev, date }))}
                          initialFocus
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="termReason">Reason</Label>
                      <Textarea
                        id="termReason"
                        placeholder="Why is it being terminated?"
                        value={terminationData.reason}
                        onChange={(e) => setTerminationData(prev => ({ ...prev, reason: e.target.value }))}
                      />
                    </div>
                    <Button
                      className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleTerminate}
                      disabled={!terminationData.date || !terminationData.reason}
                    >
                      Confirm Termination
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
          <div className="flex-1" />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </>
  );
}
