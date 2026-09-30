import { useState, useMemo } from 'react';
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
import { Plus, Check, ChevronsUpDown, CalendarIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { useContracts } from '@/hooks/useContracts';
import { useToast } from '@/hooks/use-toast';
import { BillingPeriod, InvoiceDay, QuarterlyMonths, ContractCategory, BILLING_PERIOD_LABELS } from '@/types/contracts';
import { useDeviceCatalog } from '@/hooks/useDeviceCatalog';
import { format, parse, isValid } from 'date-fns';

interface QuickAddContractFormProps {
  onSuccess?: () => void;
  /** Which contract group the new contract belongs to (defaults to copier) */
  category?: ContractCategory;
}

export function QuickAddContractForm({ onSuccess, category = 'copier' }: QuickAddContractFormProps) {
  const [formData, setFormData] = useState({
    contractNumber: '',
    customer: '',
    machineSite: '',
    brand: '',
    model: '',
    serialNumber: '',
    billingPeriod: 'MB' as BillingPeriod,
    invoiceDay: 15 as InvoiceDay,
    quarterlyMonths: undefined as QuarterlyMonths | undefined,
    startDate: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const [useExistingCustomer, setUseExistingCustomer] = useState(false);
  const [openCustomerDropdown, setOpenCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [openDatePicker, setOpenDatePicker] = useState(false);

  const { contracts, addContract } = useContracts();
  const { toast } = useToast();

  // 'copier' -> brands (Canon, Ricoh...) | 'other' -> device types (Shredder, Paper Cut...)
  const { brands, modelsForBrand } = useDeviceCatalog(category);
  const brandLabel = category === 'copier' ? 'Brand' : 'Device Type';
  const modelOptions = useMemo(() => modelsForBrand(formData.brand), [modelsForBrand, formData.brand]);

  const existingCustomers = useMemo(() => {
    const activeContracts = contracts.filter(c => c.status !== 'pulled_out' && c.status !== 'archived');
    const customers = new Set(activeContracts.map(c => c.customer));
    return Array.from(customers).sort((a, b) => a.localeCompare(b));
  }, [contracts]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return existingCustomers;
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const searchNormalized = normalize(customerSearch);
    return existingCustomers.filter(c => normalize(c).includes(searchNormalized));
  }, [existingCustomers, customerSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contractNumber || !formData.customer) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in Contract# and Customer',
        variant: 'destructive',
      });
      return;
    }

    addContract({
      contractNumber: formData.contractNumber,
      customer: formData.customer,
      machineSite: formData.machineSite,
      category,
      brand: formData.brand || undefined,
      model: formData.model || undefined,
      serialNumber: formData.serialNumber || undefined,
      billingPeriod: formData.billingPeriod,
      invoiceDay: formData.invoiceDay,
      quarterlyMonths: formData.quarterlyMonths,
      startDate: formData.startDate,
      status: 'active',
      notes: formData.notes || undefined,
    });

    toast({
      title: 'Contract added',
      description: `Contract ${formData.contractNumber} created successfully`,
    });

    // Reset form
    setFormData({
      contractNumber: '',
      customer: '',
      machineSite: '',
      brand: '',
      model: '',
      serialNumber: '',
      billingPeriod: 'MB',
      invoiceDay: 15,
      quarterlyMonths: undefined,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
    setOpenDatePicker(false);
    onSuccess?.();
  };

  // All periods except MB need a schedule selection
  const periodNeedsSchedule = formData.billingPeriod !== 'MB';

  // Get schedule label based on period
  const getScheduleLabel = () => {
    switch (formData.billingPeriod) {
      case 'QB':
      case 'MBQX':
      case 'QBYX':
        return 'Quarterly Schedule';
      case 'YB':
        return 'Yearly Month';
      case 'HY':
      case 'MBHX':
        return 'Half-Yearly Cycle';
      case '2MBX':
        return 'Bi-Monthly Cycle';
      case 'MBYX':
        return 'Yearly Excess Month';
      default:
        return 'Billing Month';
    }
  };

  // Get schedule options based on period
  const getScheduleOptions = () => {
    switch (formData.billingPeriod) {
      // Quarterly-based periods: 3 schedule options
      case 'QB':
      case 'MBQX':
      case 'QBYX':
        return [
          { value: 'JAN-APR-JUL-OCT', label: 'JAN-APR-JUL-OCT' },
          { value: 'FEB-MAY-AUG-NOV', label: 'FEB-MAY-AUG-NOV' },
          { value: 'MAR-JUN-SEP-DEC', label: 'MAR-JUN-SEP-DEC' },
        ];

      // Yearly: Select which month to bill
      case 'YB':
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

      // Half-Yearly: Six cycle options
      case 'HY':
      case 'MBHX':
        return [
          { value: 'JAN-JUL', label: 'JAN & JUL' },
          { value: 'FEB-AUG', label: 'FEB & AUG' },
          { value: 'MAR-SEP', label: 'MAR & SEP' },
          { value: 'APR-OCT', label: 'APR & OCT' },
          { value: 'MAY-NOV', label: 'MAY & NOV' },
          { value: 'JUN-DEC', label: 'JUN & DEC' },
        ];

      // Bi-Monthly: Odd or Even month cycles
      case '2MBX':
        return [
          { value: 'JAN-MAR-MAY-JUL-SEP-NOV', label: 'Odd: JAN-MAR-MAY-JUL-SEP-NOV' },
          { value: 'FEB-APR-JUN-AUG-OCT-DEC', label: 'Even: FEB-APR-JUN-AUG-OCT-DEC' },
        ];

      // Monthly + Yearly Excess: Select yearly excess month
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

      // MB: All months, no selection needed
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
      case 'MBHX':
        return 'JAN-JUL';
      case '2MBX':
        return 'JAN-MAR-MAY-JUL-SEP-NOV';
      default:
        return undefined;
    }
  };

  const scheduleOptions = getScheduleOptions();

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Row 1: Contract#, Customer, Machine/Site, Period */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contractNumber" className="text-xs mb-1 block">Contract#</Label>
          <Input
            id="contractNumber"
            placeholder="C001"
            value={formData.contractNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, contractNumber: e.target.value }))}
          />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="customer" className="text-xs">Customer</Label>
            <div className="flex items-center space-x-1">
              <Checkbox
                id="existing-customer"
                checked={useExistingCustomer}
                onCheckedChange={(checked) => {
                  setUseExistingCustomer(!!checked);
                  setFormData(prev => ({ ...prev, customer: '' }));
                  setCustomerSearch('');
                }}
              />
              <label
                htmlFor="existing-customer"
                className="text-[10px] font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Existing
              </label>
            </div>
          </div>
          {useExistingCustomer ? (
            <Popover open={openCustomerDropdown} onOpenChange={setOpenCustomerDropdown}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCustomerDropdown}
                  className="w-full justify-between font-normal text-left px-3 h-10"
                >
                  <span className="truncate max-w-[calc(100%-20px)]">
                    {formData.customer || <span className="text-muted-foreground">Select customer...</span>}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] sm:w-[350px] p-0 z-[10001]">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search customer..."
                    value={customerSearch}
                    onValueChange={setCustomerSearch}
                  />
                  <CommandList>
                    {filteredCustomers.length === 0 ? (
                      <CommandEmpty>No customer found.</CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {filteredCustomers.map((customer) => (
                          <CommandItem
                            key={customer}
                            value={customer}
                            onSelect={() => {
                              setFormData(prev => ({ ...prev, customer: customer }));
                              setOpenCustomerDropdown(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0",
                                formData.customer === customer ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="truncate">{customer}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <Input
              id="customer"
              placeholder="Customer name"
              value={formData.customer}
              onChange={(e) => setFormData(prev => ({ ...prev, customer: e.target.value }))}
            />
          )}
        </div>
        <div>
          <Label htmlFor="machineSite" className="text-xs mb-1 block">Machine/Site</Label>
          <Input
            id="machineSite"
            placeholder="Machine or site"
            value={formData.machineSite}
            onChange={(e) => setFormData(prev => ({ ...prev, machineSite: e.target.value }))}
          />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Period</Label>
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
            <SelectContent className="z-[999]" style={{ zIndex: 10000 }}>
              {Object.entries(BILLING_PERIOD_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{key}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: Invoice Day, Schedule, Start Date */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-xs mb-1 block">Invoice Day</Label>
          <Select
            value={String(formData.invoiceDay)}
            onValueChange={(v) => setFormData(prev => ({ ...prev, invoiceDay: parseInt(v) as InvoiceDay }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[999]" style={{ zIndex: 10000 }}>
              <SelectItem value="5">5th</SelectItem>
              <SelectItem value="15">15th</SelectItem>
              <SelectItem value="25">25th</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs mb-1 block">{getScheduleLabel()}</Label>
          <Select
            value={formData.quarterlyMonths || 'none'}
            onValueChange={(v) => setFormData(prev => ({
              ...prev,
              quarterlyMonths: v === 'none' ? undefined : v as QuarterlyMonths
            }))}
            disabled={!periodNeedsSchedule}
          >
            <SelectTrigger className={!periodNeedsSchedule ? 'opacity-50' : ''}>
              <SelectValue placeholder={periodNeedsSchedule ? 'Select schedule...' : 'N/A'} />
            </SelectTrigger>
            <SelectContent className="z-[999]" style={{ zIndex: 10000 }}>
              <SelectItem value="none">None</SelectItem>
              {scheduleOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs mb-1 block">Start Date</Label>
          <Popover open={openDatePicker} onOpenChange={setOpenDatePicker}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn('w-full justify-start text-left font-normal h-10', !formData.startDate && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.startDate
                  ? format(parse(formData.startDate, 'yyyy-MM-dd', new Date()), 'dd MMM yyyy')
                  : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[10001]" align="start">
              <Calendar
                mode="single"
                selected={formData.startDate ? parse(formData.startDate, 'yyyy-MM-dd', new Date()) : undefined}
                onSelect={(date) => {
                  if (date && isValid(date)) {
                    setFormData(prev => ({ ...prev, startDate: format(date, 'yyyy-MM-dd') }));
                  }
                  setOpenDatePicker(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Row 3: Brand/Device Type, Model, Serial No */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-xs mb-1 block">{brandLabel}</Label>
          <Select
            value={formData.brand || 'none'}
            onValueChange={(v) => setFormData(prev => {
              const nextBrand = v === 'none' ? '' : v;
              // Clear the model if it no longer belongs to the selected brand
              const keepModel = prev.model
                && modelsForBrand(nextBrand).some(m => m.toLowerCase() === prev.model.toLowerCase());
              return { ...prev, brand: nextBrand, model: keepModel ? prev.model : '' };
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent className="z-[999]" style={{ zIndex: 10000 }}>
              <SelectItem value="none">None</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.name}>{brand.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs mb-1 block">Model</Label>
          <Select
            value={formData.model || 'none'}
            onValueChange={(v) => setFormData(prev => ({ ...prev, model: v === 'none' ? '' : v }))}
            disabled={!formData.brand}
          >
            <SelectTrigger className={!formData.brand ? 'opacity-50' : ''}>
              <SelectValue placeholder={formData.brand ? 'Select model...' : 'Select brand first'} />
            </SelectTrigger>
            <SelectContent className="z-[999]" style={{ zIndex: 10000 }}>
              <SelectItem value="none">None</SelectItem>
              {modelOptions.map((model) => (
                <SelectItem key={model} value={model}>{model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="serialNumber" className="text-xs mb-1 block">Serial No</Label>
          <Input
            id="serialNumber"
            placeholder="Serial number"
            value={formData.serialNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes" className="text-xs mb-1 block">Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Any additional notes..."
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Contract
      </Button>
    </form>
  );
}
