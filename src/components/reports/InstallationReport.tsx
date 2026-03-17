import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/alert-dialog';
import { Download, FileWarning, Trash2 } from 'lucide-react';
import { Contract } from '@/types/contracts';
import { MONTH_NAMES } from '@/lib/billingPeriodColors';
import { exportInstallationReportToExcel } from '@/lib/installationReportExcel';
import { useToast } from '@/hooks/use-toast';
import { useContracts } from '@/hooks/useContracts';

interface InstallationReportProps {
    contracts: Contract[];
}

export function InstallationReport({ contracts }: InstallationReportProps) {
    const { toast } = useToast();
    const { deleteContract } = useContracts();
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState<string>(String(currentDate.getFullYear()));
    const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Generate available years (current ± 5)
    const availableYears = useMemo(() => {
        const current = new Date().getFullYear();
        const years: number[] = [];
        for (let y = current - 5; y <= current + 1; y++) years.push(y);
        return years;
    }, []);

    // Filter for cancelled contracts by month
    const cancelledContracts = useMemo(() => {
        const cancelled = contracts.filter(c => c.status === 'pulled_out' || c.status === 'archived');

        if (selectedMonth === 'all') return cancelled;

        const month = parseInt(selectedMonth, 10);
        const year = parseInt(selectedYear, 10);

        return cancelled.filter(c => {
            if (!c.terminationDate) return false;
            const parts = c.terminationDate.split('-');
            if (parts.length < 2) return false;
            const tYear = parseInt(parts[0], 10);
            const tMonth = parseInt(parts[1], 10);
            return tMonth === month && tYear === year;
        });
    }, [contracts, selectedMonth, selectedYear]);

    const handleExport = async () => {
        const month = selectedMonth === 'all' ? null : parseInt(selectedMonth, 10);
        const year = selectedMonth === 'all' ? null : parseInt(selectedYear, 10);

        const { count, filename } = await exportInstallationReportToExcel(contracts, month, year);

        if (count === 0) {
            toast({
                title: 'No cancelled contracts',
                description: selectedMonth === 'all'
                    ? 'No cancelled contracts found.'
                    : `No cancelled contracts in ${MONTH_NAMES[parseInt(selectedMonth, 10) - 1]} ${selectedYear}`,
                variant: 'destructive',
            });
        } else {
            toast({ title: 'Export complete', description: `${count} contracts exported to ${filename}` });
        }
    };

    const handleConfirmDelete = async () => {
        if (!contractToDelete) return;
        setIsDeleting(true);
        await deleteContract(contractToDelete.id);
        setIsDeleting(false);
        setContractToDelete(null);
        toast({
            title: 'Contract permanently deleted',
            description: `Contract ${contractToDelete.contractNumber} has been removed from the database.`,
        });
    };

    return (
        <>
            <Card className="glass-card hover:border-primary/30 transition-colors">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-destructive/10">
                                <FileWarning className="h-5 w-5 text-destructive" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Cancelled Contracts</CardTitle>
                                <CardDescription>Cancelled contracts by month</CardDescription>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                            <Download className="h-4 w-4" />
                            Export Excel
                        </Button>
                    </div>
                </CardHeader>

                <CardContent>
                    {/* Filters */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Month:</span>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger className="w-[130px] h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Months</SelectItem>
                                    {MONTH_NAMES.map((name, idx) => (
                                        <SelectItem key={idx} value={String(idx + 1)}>{name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedMonth !== 'all' && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Year:</span>
                                <Select value={selectedYear} onValueChange={setSelectedYear}>
                                    <SelectTrigger className="w-[90px] h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableYears.map((year) => (
                                            <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <span className="text-sm text-muted-foreground">
                            {cancelledContracts.length} contract{cancelledContracts.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Table */}
                    {cancelledContracts.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted/50 border-b">
                                            <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-[70px]">SI No</th>
                                            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Contract</th>
                                            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Customer</th>
                                            <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Machine / Site</th>
                                            <th className="px-4 py-3 text-left font-semibold text-muted-foreground w-[130px]">Cancelled On</th>
                                            <th className="px-4 py-3 w-[60px]"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {cancelledContracts.map((contract, index) => (
                                            <tr key={contract.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-2.5 text-muted-foreground">{index + 1}</td>
                                                <td className="px-4 py-2.5 font-medium">{contract.contractNumber}</td>
                                                <td className="px-4 py-2.5">{contract.customer}</td>
                                                <td className="px-4 py-2.5">{contract.machineSite}</td>
                                                <td className="px-4 py-2.5 text-destructive/80">
                                                    {contract.terminationDate
                                                        ? new Date(contract.terminationDate + 'T00:00:00').toLocaleDateString('en-GB', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        })
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => setContractToDelete(contract)}
                                                        title="Permanently delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="py-8 text-center text-muted-foreground/50 border-2 border-dashed border-muted rounded-xl bg-muted/5">
                            <FileWarning className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No cancelled contracts found for this period.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Permanent Delete Confirmation */}
            <AlertDialog open={!!contractToDelete} onOpenChange={(open) => { if (!open) setContractToDelete(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Permanently Delete Contract?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove contract <strong>{contractToDelete?.contractNumber}</strong> for{' '}
                            <strong>{contractToDelete?.customer}</strong> from the database. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={isDeleting}
                            onClick={handleConfirmDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
