import { useMemo, useState } from 'react';
import { useContracts } from '@/hooks/useContracts';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Archive, Search, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { Contract, BILLING_PERIOD_LABELS, BillingPeriod, InvoiceDay } from '@/types/contracts';
import { ContractsTableWithMonths } from '@/components/contracts/ContractsTableWithMonths';
import { EditContractForm, ChangeRecord } from '@/components/contracts/EditContractForm';
import { useToast } from '@/hooks/use-toast';

type SortField = 'contractNumber' | 'customer' | 'billingPeriod' | 'status' | 'invoiceDay' | 'nextInvoiceDate';
type SortDirection = 'asc' | 'desc';

export default function ArchivedContracts() {
    const { contracts, deleteContract, updateContract } = useContracts();
    const { toast } = useToast();

    const [search, setSearch] = useState('');
    const [periodFilter, setPeriodFilter] = useState<BillingPeriod | 'all'>('all');
    const [sortField, setSortField] = useState<SortField>('customer');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [editingContract, setEditingContract] = useState<Contract | null>(null);
    const [editingDirty, setEditingDirty] = useState(false);
    const [editingChanges, setEditingChanges] = useState<ChangeRecord[]>([]);
    const [showUnsavedAlert, setShowUnsavedAlert] = useState(false);

    // Filter for archived/pulled_out only
    const archivedContracts = useMemo(() => {
        let result = contracts.filter(c => c.status === 'pulled_out' || c.status === 'archived');

        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(c =>
                c.customer.toLowerCase().includes(searchLower) ||
                c.contractNumber.toLowerCase().includes(searchLower) ||
                c.machineSite.toLowerCase().includes(searchLower)
            );
        }

        if (periodFilter !== 'all') {
            result = result.filter(c => c.billingPeriod === periodFilter);
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
    }, [contracts, search, periodFilter, sortField, sortDirection]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleDelete = (contract: Contract) => {
        if (confirm(`Permanently delete contract ${contract.contractNumber}? This cannot be undone.`)) {
            deleteContract(contract.id);
            toast({
                title: 'Contract deleted',
                description: `Contract ${contract.contractNumber} has been permanently removed.`,
            });
            setEditingContract(null);
        }
    };

    const handleRestore = (contract: Contract) => {
        updateContract(contract.id, { status: 'active', terminationDate: undefined, terminationReason: undefined });
        toast({
            title: 'Contract Restored',
            description: `Contract ${contract.contractNumber} is now Active.`,
        });
    };

    const handleUpdateField = (contractId: string, field: keyof Contract, value: any) => {
        updateContract(contractId, { [field]: value });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 pb-2 border-b border-border/40">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold gradient-text tracking-tight">Archived Contracts</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            View and manage terminated or archived agreements.
                        </p>
                    </div>
                    <Badge variant="secondary" className="px-3 py-1 text-sm h-7">
                        {archivedContracts.length} Archived
                    </Badge>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 mt-1">
                    <div className="relative flex-1 max-w-[300px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search archived..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9"
                        />
                    </div>

                    <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as any)}>
                        <SelectTrigger className="w-[140px] h-9">
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Periods</SelectItem>
                            {Object.entries(BILLING_PERIOD_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{key}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {archivedContracts.length > 0 ? (
                <Card className="glass-panel overflow-hidden animate-slide-up">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-muted via-muted-foreground/20 to-muted" />
                    <ContractsTableWithMonths
                        data={archivedContracts}
                        onUpdateField={handleUpdateField}
                        onRowClick={setEditingContract}
                        onSort={(field) => handleSort(field as SortField)}
                        sortField={sortField}
                        sortDirection={sortDirection}
                    />
                </Card>
            ) : (
                <div className="py-12 text-center text-muted-foreground/50 border-2 border-dashed border-muted rounded-xl bg-muted/5">
                    <Archive className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No archived contracts found.</p>
                </div>
            )}

            {/* Edit/View Dialog */}
            <Dialog open={!!editingContract} onOpenChange={(open) => {
                if (!open) {
                    if (editingDirty) {
                        setShowUnsavedAlert(true);
                        return;
                    }
                    setEditingContract(null);
                }
            }}>
                <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto" onInteractOutside={(e) => {
                    e.preventDefault();
                    console.log('Archived: Interact outside prevented');
                }}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span>Contract: {editingContract?.contractNumber}</span>
                            <Badge variant="outline" className="text-muted-foreground">Archived</Badge>
                        </DialogTitle>
                    </DialogHeader>
                    {editingContract && (
                        <div className="space-y-6">
                            <div className="p-4 bg-muted/30 rounded-lg border border-border/50 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-medium text-sm">Termination Details</h4>
                                        <p className="text-sm text-destructive mt-1">Reason: {editingContract.terminationReason || 'No reason provided'}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Date: {editingContract.terminationDate || 'Unknown'}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="gap-2 text-primary hover:text-primary hover:bg-primary/10"
                                        onClick={() => {
                                            handleRestore(editingContract);
                                            setEditingContract(null);
                                        }}
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        Restore Contract
                                    </Button>
                                </div>
                            </div>

                            <div className="relative opacity-75 grayscale-[0.5]">
                                <EditContractForm
                                    contract={editingContract}
                                    onSuccess={() => setEditingContract(null)}
                                    onDelete={() => handleDelete(editingContract)}
                                    onDirtyChange={(isDirty, changes) => {
                                        setEditingDirty(isDirty);
                                        setEditingChanges(changes);
                                    }}
                                />
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => handleDelete(editingContract)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete Permanently
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Unsaved Changes Alert */}
            <AlertDialog open={showUnsavedAlert} onOpenChange={setShowUnsavedAlert}>
                <AlertDialogContent className="z-[200]">
                    <AlertDialogHeader>
                        <DialogTitle>Unsaved Changes</DialogTitle>
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
