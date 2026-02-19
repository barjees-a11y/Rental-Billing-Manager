import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Contract, BillingPeriod, InvoiceDay, BILLING_PERIOD_LABELS, QuarterlyMonths } from '@/types/contracts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUpDown, GripVertical } from 'lucide-react';
import { EditableCell } from './EditableCell';
import { EditableSelect } from './EditableSelect';
import { BILLING_PERIOD_COLORS, getQuarterDisplayMonth, QuarterDefinition } from '@/lib/billingPeriodColors';
import { cn } from '@/lib/utils';

interface ContractsTableWithMonthsProps {
  data: Contract[];
  onUpdateField: (contractId: string, field: keyof Contract, value: any) => void;
  onRowClick?: (contract: Contract) => void;
  onSort?: (field: string) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

const billingPeriodOptions = Object.entries(BILLING_PERIOD_LABELS).map(([value, label]) => ({
  value: value as BillingPeriod,
  label: value,
}));

const invoiceDayOptions: { value: string; label: string }[] = [
  { value: '5', label: '5th' },
  { value: '15', label: '15th' },
  { value: '25', label: '25th' },
];

// Quarter definitions with display headers
const QUARTERS: readonly QuarterDefinition[] = [
  { label: 'JAN-FEB-MAR', months: [1, 2, 3], names: ['JAN', 'FEB', 'MAR'] },
  { label: 'APR-MAY-JUN', months: [4, 5, 6], names: ['APR', 'MAY', 'JUN'] },
  { label: 'JUL-AUG-SEP', months: [7, 8, 9], names: ['JUL', 'AUG', 'SEP'] },
  { label: 'OCT-NOV-DEC', months: [10, 11, 12], names: ['OCT', 'NOV', 'DEC'] },
];

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
        { value: 'JAN', label: 'JAN' },
        { value: 'FEB', label: 'FEB' },
        { value: 'MAR', label: 'MAR' },
        { value: 'APR', label: 'APR' },
        { value: 'MAY', label: 'MAY' },
        { value: 'JUN', label: 'JUN' },
        { value: 'JUL', label: 'JUL' },
        { value: 'AUG', label: 'AUG' },
        { value: 'SEP', label: 'SEP' },
        { value: 'OCT', label: 'OCT' },
        { value: 'NOV', label: 'NOV' },
        { value: 'DEC', label: 'DEC' },
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

// Default column widths (used only when manually resized)
const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  siNo: 50,
  contractNumber: 100,
  customer: 200,
  machineSite: 180,
  billingPeriod: 80,
  invoiceDay: 90,
  billingSchedule: 160,
  q1: 100,
  q2: 100,
  q3: 100,
  q4: 100,
  actions: 70,
};

interface ResizableHeaderProps {
  children: React.ReactNode;
  field: string;
  width?: number;
  hasManualWidth: boolean;
  onResize: (field: string, width: number) => void;
  onSort?: (field: string) => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  className?: string;
  sortable?: boolean;
}

const ResizableHeader = ({
  children,
  field,
  width,
  hasManualWidth,
  onResize,
  onSort,
  sortField,
  sortDirection,
  className,
  sortable = true,
}: ResizableHeaderProps) => {
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const headerRef = useRef<HTMLTableCellElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width || headerRef.current?.offsetWidth || DEFAULT_COLUMN_WIDTHS[field] || 100;
  }, [width, field]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(50, startWidthRef.current + diff);
      onResize(field, newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, field, onResize]);

  const styleProps = hasManualWidth && width
    ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }
    : {};

  return (
    <TableHead
      ref={headerRef}
      className={cn(
        "relative group",
        sortable && "cursor-pointer hover:bg-primary/20 transition-colors",
        className
      )}
      style={styleProps}
      onClick={() => sortable && onSort?.(field)}
    >
      <div className="flex items-center gap-1 pr-3">
        <span className="truncate">{children}</span>
        {sortable && (
          <ArrowUpDown className={cn(
            "h-3 w-3 flex-shrink-0",
            sortField === field ? "text-primary" : "text-muted-foreground/50"
          )} />
        )}
      </div>
      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
    </TableHead>
  );
};

export const ContractsTableWithMonths = React.memo(function ContractsTableWithMonths({
  data,
  onUpdateField,
  onRowClick,
  onSort,
  sortField,
  sortDirection
}: ContractsTableWithMonthsProps) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(DEFAULT_COLUMN_WIDTHS);
  const [hasManualWidth, setHasManualWidth] = useState<Record<string, boolean>>({});
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const handleResize = useCallback((field: string, width: number) => {
    setColumnWidths(prev => ({ ...prev, [field]: width }));
    setHasManualWidth(prev => ({ ...prev, [field]: true }));
  }, []);

  const getCellStyle = (field: string) => {
    if (hasManualWidth[field]) {
      const width = columnWidths[field];
      return {
        width: `${width}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
        wordWrap: 'break-word' as const,
        whiteSpace: 'normal' as const,
      };
    }
    return {};
  };

  return (
    <div className="relative flex flex-col">
      {/* Table container with scroll */}
      <div
        ref={tableContainerRef}
        className="w-full max-h-[calc(100vh-120px)] overflow-auto always-show-scrollbar"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <table className="caption-bottom text-sm w-full table-auto">
          <TableHeader className="sticky top-0 z-20">
            <TableRow className="bg-[#1e3a5f]">
              {/* SI No column - non-sortable */}
              <ResizableHeader
                field="siNo"
                width={columnWidths.siNo}
                hasManualWidth={hasManualWidth.siNo || false}
                onResize={handleResize}
                className="text-[#c9a227] font-bold whitespace-nowrap border-r border-[#2d4a6f] bg-[#1e3a5f]"
                sortable={false}
              >
                SI No
              </ResizableHeader>
              <ResizableHeader
                field="contractNumber"
                width={columnWidths.contractNumber}
                hasManualWidth={hasManualWidth.contractNumber || false}
                onResize={handleResize}
                onSort={onSort}
                sortField={sortField}
                sortDirection={sortDirection}
                className="text-[#c9a227] font-bold whitespace-nowrap border-r border-[#2d4a6f] bg-[#1e3a5f]"
              >
                Contract#
              </ResizableHeader>
              <ResizableHeader
                field="customer"
                width={columnWidths.customer}
                hasManualWidth={hasManualWidth.customer || false}
                onResize={handleResize}
                onSort={onSort}
                sortField={sortField}
                sortDirection={sortDirection}
                className="text-[#c9a227] font-bold border-r border-[#2d4a6f] bg-[#1e3a5f]"
              >
                Customer
              </ResizableHeader>
              <ResizableHeader
                field="machineSite"
                width={columnWidths.machineSite}
                hasManualWidth={hasManualWidth.machineSite || false}
                onResize={handleResize}
                onSort={onSort}
                sortField={sortField}
                sortDirection={sortDirection}
                className="text-[#c9a227] font-bold border-r border-[#2d4a6f] bg-[#1e3a5f]"
              >
                Machine/Site
              </ResizableHeader>
              <ResizableHeader
                field="billingPeriod"
                width={columnWidths.billingPeriod}
                hasManualWidth={hasManualWidth.billingPeriod || false}
                onResize={handleResize}
                onSort={onSort}
                sortField={sortField}
                sortDirection={sortDirection}
                className="text-[#c9a227] font-bold whitespace-nowrap border-r border-[#2d4a6f] bg-[#1e3a5f]"
              >
                Period
              </ResizableHeader>
              <ResizableHeader
                field="invoiceDay"
                width={columnWidths.invoiceDay}
                hasManualWidth={hasManualWidth.invoiceDay || false}
                onResize={handleResize}
                onSort={onSort}
                sortField={sortField}
                sortDirection={sortDirection}
                className="text-[#c9a227] font-bold whitespace-nowrap border-r border-[#2d4a6f] bg-[#1e3a5f]"
              >
                Invoice Day
              </ResizableHeader>
              <ResizableHeader
                field="billingSchedule"
                width={columnWidths.billingSchedule}
                hasManualWidth={hasManualWidth.billingSchedule || false}
                onResize={handleResize}
                onSort={onSort}
                sortField={sortField}
                sortDirection={sortDirection}
                className="text-[#c9a227] font-bold whitespace-nowrap border-r border-[#2d4a6f] bg-[#1e3a5f]"
              >
                Billing Schedule
              </ResizableHeader>
              {/* Q1-Q4 columns */}
              {QUARTERS.map((quarter, idx) => (
                <ResizableHeader
                  key={quarter.label}
                  field={`q${idx + 1}`}
                  width={columnWidths[`q${idx + 1}`]}
                  hasManualWidth={hasManualWidth[`q${idx + 1}`] || false}
                  onResize={handleResize}
                  className={cn(
                    "text-center text-[#c9a227] font-bold px-2 bg-[#1e3a5f]",
                    idx < 3 ? "border-r border-[#2d4a6f]" : ""
                  )}
                  sortable={false}
                >
                  {quarter.label}
                </ResizableHeader>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((contract, rowIndex) => {
              const periodColor = BILLING_PERIOD_COLORS[contract.billingPeriod];
              const scheduleOptions = getScheduleOptions(contract.billingPeriod);
              const isMB = contract.billingPeriod === 'MB';

              return (
                <TableRow
                  key={contract.id}
                  className="group cursor-pointer hover:ring-1 hover:ring-primary/30 hover:brightness-110 transition-all duration-150"
                  style={{
                    backgroundColor: periodColor ? `hsl(${getPeriodHSL(contract.billingPeriod)})` : undefined
                  }}
                  onClick={() => onRowClick?.(contract)}
                >
                  {/* SI No column */}
                  <TableCell
                    className={cn(
                      "font-medium border-r border-border/20 text-center",
                      periodColor?.text
                    )}
                    style={getCellStyle('siNo')}
                  >
                    {rowIndex + 1}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "font-medium border-r border-border/20",
                      periodColor?.text
                    )}
                    style={getCellStyle('contractNumber')}
                  >
                    <EditableCell
                      value={contract.contractNumber}
                      onSave={(v) => onUpdateField(contract.id, 'contractNumber', v)}
                    />
                  </TableCell>
                  <TableCell
                    className={cn("border-r border-border/20", periodColor?.text)}
                    style={getCellStyle('customer')}
                  >
                    <EditableCell
                      value={contract.customer}
                      onSave={(v) => onUpdateField(contract.id, 'customer', v)}
                    />
                  </TableCell>
                  <TableCell
                    className={cn("border-r border-border/20", periodColor?.text)}
                    style={getCellStyle('machineSite')}
                  >
                    <EditableCell
                      value={contract.machineSite}
                      onSave={(v) => onUpdateField(contract.id, 'machineSite', v)}
                    />
                  </TableCell>
                  <TableCell
                    className="border-r border-border/20"
                    style={getCellStyle('billingPeriod')}
                  >
                    <EditableSelect
                      value={contract.billingPeriod}
                      options={billingPeriodOptions}
                      onSave={(v) => onUpdateField(contract.id, 'billingPeriod', v as BillingPeriod)}
                      variant="badge"
                    />
                  </TableCell>
                  <TableCell
                    className={cn("border-r border-border/20 text-center", periodColor?.text)}
                    style={getCellStyle('invoiceDay')}
                  >
                    <EditableSelect
                      value={String(contract.invoiceDay)}
                      options={invoiceDayOptions}
                      onSave={(v) => onUpdateField(contract.id, 'invoiceDay', parseInt(v) as InvoiceDay)}
                    />
                  </TableCell>
                  <TableCell
                    className={cn("border-r border-border/20 text-center", periodColor?.text)}
                    style={getCellStyle('billingSchedule')}
                  >
                    {isMB ? (
                      <span className="text-muted-foreground text-sm">All Months</span>
                    ) : (
                      <EditableSelect
                        value={contract.quarterlyMonths || ''}
                        options={scheduleOptions}
                        onSave={(v) => onUpdateField(contract.id, 'quarterlyMonths', v as QuarterlyMonths)}
                      />
                    )}
                  </TableCell>
                  {/* Quarter cells - show billing month */}
                  {QUARTERS.map((quarter, idx) => {
                    const billingMonth = getQuarterDisplayMonth(
                      contract.billingPeriod,
                      contract.quarterlyMonths,
                      quarter
                    );

                    return (
                      <TableCell
                        key={quarter.label}
                        className={cn(
                          "text-center font-bold px-2",
                          idx < 3 ? "border-r border-border/20" : "",
                          periodColor?.text
                        )}
                        style={getCellStyle(`q${idx + 1}`)}
                      >
                        {billingMonth}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </table>
      </div>
    </div>
  );
});

/**
 * Get HSL color values for period-based row background
 */
function getPeriodHSL(billingPeriod: BillingPeriod): string {
  const hslMap: Record<BillingPeriod, string> = {
    'MB': '217 91% 60% / 0.15',      // Blue
    'QB': '142 71% 45% / 0.15',      // Green
    'MBQX': '271 81% 56% / 0.15',    // Purple
    'QBYX': '25 95% 53% / 0.15',     // Orange
    'YB': '0 72% 51% / 0.15',        // Red
    'HY': '168 80% 45% / 0.15',      // Teal
    '2MBX': '330 81% 60% / 0.15',    // Pink
    'MBYX': '45 93% 47% / 0.15',     // Amber
  };
  return hslMap[billingPeriod] || '0 0% 50% / 0.1';
}
