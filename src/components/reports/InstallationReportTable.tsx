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
import { Download, ClipboardList } from 'lucide-react';
import { Contract } from '@/types/contracts';
import { MONTH_NAMES, getQuarterDisplayMonth, QuarterDefinition } from '@/lib/billingPeriodColors';
import { useBillingPeriods } from '@/hooks/useBillingPeriods';
import { exportInstallationTableToExcel } from '@/lib/installationTableExcel';
import { useToast } from '@/hooks/use-toast';

interface InstallationReportTableProps {
    contracts: Contract[];
}

const QUARTERS: QuarterDefinition[] = [
    { label: 'JAN-FEB-MAR', months: [1, 2, 3], names: ['JAN', 'FEB', 'MAR'] },
    { label: 'APR-MAY-JUN', months: [4, 5, 6], names: ['APR', 'MAY', 'JUN'] },
    { label: 'JUL-AUG-SEP', months: [7, 8, 9], names: ['JUL', 'AUG', 'SEP'] },
    { label: 'OCT-NOV-DEC', months: [10, 11, 12], names: ['OCT', 'NOV', 'DEC'] },
];

export function InstallationReportTable({ contracts }: InstallationReportTableProps) {
    const { toast } = useToast();
    const { allPeriods } = useBillingPeriods();
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState<string>(String(currentDate.getFullYear()));

    const availableYears = useMemo(() => {
        const current = new Date().getFullYear();
        const years: number[] = [];
        for (let y = current - 5; y <= current + 1; y++) years.push(y);
        return years;
    }, []);

    // Filter all contracts by installation month (startDate)
    const filteredContracts = useMemo(() => {
        if (selectedMonth === 'all') return contracts;

        const month = parseInt(selectedMonth, 10);
        const year = parseInt(selectedYear, 10);

        return contracts.filter(c => {
            if (!c.startDate) return false;
            const parts = c.startDate.split('-');
            if (parts.length < 2) return false;
            const sYear = parseInt(parts[0], 10);
            const sMonth = parseInt(parts[1], 10);
            return sMonth === month && sYear === year;
        });
    }, [contracts, selectedMonth, selectedYear]);

    const handleExport = async () => {
        const month = selectedMonth === 'all' ? null : parseInt(selectedMonth, 10);
        const year = selectedMonth === 'all' ? null : parseInt(selectedYear, 10);

        const { count, filename } = await exportInstallationTableToExcel(contracts, month, year, allPeriods);

        if (count === 0) {
            toast({
                title: 'No contracts',
                description: selectedMonth === 'all'
                    ? 'No contracts found.'
                    : `No installations in ${MONTH_NAMES[parseInt(selectedMonth, 10) - 1]} ${selectedYear}`,
                variant: 'destructive',
            });
        } else {
            toast({ title: 'Export complete', description: `${count} contracts exported to ${filename}` });
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <Card className="glass-card hover:border-primary/30 transition-colors">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <ClipboardList className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Installation Report</CardTitle>
                            <CardDescription>All contracts by installation month</CardDescription>
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
                        {filteredContracts.length} contract{filteredContracts.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* Table */}
                {filteredContracts.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/50 border-b">
                                        <th className="px-3 py-3 text-left font-semibold text-muted-foreground w-[60px]">SI No</th>
                                        <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Contract#</th>
                                        <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Customer</th>
                                        <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Machine / Site</th>
                                        <th className="px-3 py-3 text-center font-semibold text-muted-foreground w-[80px]">Period</th>
                                        <th className="px-3 py-3 text-center font-semibold text-muted-foreground w-[90px]">Invoice Day</th>
                                        <th className="px-3 py-3 text-center font-semibold text-muted-foreground w-[120px]">Installation Date</th>
                                        {QUARTERS.map((q) => (
                                            <th key={q.label} className="px-3 py-3 text-center font-semibold text-muted-foreground w-[100px]">
                                                {q.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {filteredContracts.map((contract, index) => {
                                        const periodConfig = allPeriods.find(p => p.code === contract.billingPeriod);
                                        return (
                                            <tr key={contract.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-3 py-2.5 text-muted-foreground">{index + 1}</td>
                                                <td className="px-3 py-2.5 font-medium">{contract.contractNumber}</td>
                                                <td className="px-3 py-2.5">{contract.customer}</td>
                                                <td className="px-3 py-2.5">{contract.machineSite}</td>
                                                <td className="px-3 py-2.5 text-center">
                                                    {periodConfig ? (
                                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${periodConfig.color.bg} ${periodConfig.color.text}`}>
                                                            {contract.billingPeriod}
                                                        </span>
                                                    ) : contract.billingPeriod}
                                                </td>
                                                <td className="px-3 py-2.5 text-center">{contract.invoiceDay}</td>
                                                <td className="px-3 py-2.5 text-center text-primary/80">{formatDate(contract.startDate)}</td>
                                                {QUARTERS.map((q) => (
                                                    <td key={q.label} className="px-3 py-2.5 text-center text-xs">
                                                        {getQuarterDisplayMonth(contract.billingPeriod, contract.quarterlyMonths, q)}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 text-center text-muted-foreground/50 border-2 border-dashed border-muted rounded-xl bg-muted/5">
                        <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No installations found for this period.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
