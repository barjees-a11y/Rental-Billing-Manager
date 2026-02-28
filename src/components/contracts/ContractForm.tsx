import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useContracts } from '@/hooks/useContracts';
import { Contract, BillingPeriod, InvoiceDay, QuarterlyMonths, ContractStatus, BILLING_PERIOD_LABELS } from '@/types/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const contractSchema = z.object({
  contractNumber: z.string().min(1, 'Contract number is required'),
  customer: z.string().min(1, 'Customer name is required'),
  machineSite: z.string().min(1, 'Machine/Site is required'),
  billingPeriod: z.enum(['MB', 'QB', 'MBQX', 'QBYX', 'YB', 'HY', '2MBX', 'MBYX']),
  invoiceDay: z.coerce.number().refine((v) => [5, 15, 25].includes(v), 'Must be 5, 15, or 25'),
  quarterlyMonths: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  pulloutDate: z.string().optional(),
  status: z.enum(['active', 'expired', 'pulled_out', 'pending', 'suspended', 'archived']),
  notes: z.string().optional(),
});

type ContractFormData = z.infer<typeof contractSchema>;

interface ContractFormProps {
  contract?: Contract;
  onSuccess?: () => void;
}

export function ContractForm({ contract, onSuccess }: ContractFormProps) {
  const { addContract, updateContract } = useContracts();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contractNumber: contract?.contractNumber || '',
      customer: contract?.customer || '',
      machineSite: contract?.machineSite || '',
      billingPeriod: contract?.billingPeriod || 'MB',
      invoiceDay: contract?.invoiceDay || 15,
      quarterlyMonths: contract?.quarterlyMonths,
      startDate: contract?.startDate || new Date().toISOString().split('T')[0],
      endDate: contract?.endDate || '',
      pulloutDate: contract?.pulloutDate || '',
      status: contract?.status || 'active',
      notes: contract?.notes || '',
    },
  });

  const billingPeriod = form.watch('billingPeriod');
  const showQuarterlyMonths = ['QB', 'MBQX', 'QBYX'].includes(billingPeriod);

  const onSubmit = async (data: ContractFormData) => {
    setIsSubmitting(true);

    try {
      if (contract) {
        updateContract(contract.id, data as Partial<Contract>);
        toast({
          title: 'Contract updated',
          description: `Contract ${data.contractNumber} has been updated.`,
        });
      } else {
        addContract(data as Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>);
        toast({
          title: 'Contract created',
          description: `Contract ${data.contractNumber} has been created.`,
        });
      }
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Contract Info Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Contract Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="contractNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 715" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="pulled_out">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="customer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., ACME Corporation" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="machineSite"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Machine / Site</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Main Office - Printer A" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Billing Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Billing Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="billingPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Period</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(BILLING_PERIOD_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {key} - {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="invoiceDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Day</FormLabel>
                  <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="5">5th of month</SelectItem>
                      <SelectItem value="15">15th of month</SelectItem>
                      <SelectItem value="25">25th of month</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {showQuarterlyMonths && (
            <FormField
              control={form.control}
              name="quarterlyMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quarterly Months Schedule</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select schedule" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="JAN-APR-JUL-OCT">JAN - APR - JUL - OCT</SelectItem>
                      <SelectItem value="FEB-MAY-AUG-NOV">FEB - MAY - AUG - NOV</SelectItem>
                      <SelectItem value="MAR-JUN-SEP-DEC">MAR - JUN - SEP - DEC</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Dates Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2">Contract Dates</h3>
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pulloutDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pullout Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Any additional notes..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : contract ? 'Update Contract' : 'Create Contract'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
