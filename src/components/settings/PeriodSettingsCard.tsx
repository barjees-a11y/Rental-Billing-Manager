import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Calendar, GripVertical } from 'lucide-react';
import { useBillingPeriods } from '@/hooks/useBillingPeriods';
import { BillingPeriodConfig } from '@/types/contracts';
import { PeriodDialog } from './PeriodDialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface SortableTableRowProps {
  period: BillingPeriodConfig;
  getBillingLogicLabel: (p: BillingPeriodConfig) => string;
  onEdit: (p: BillingPeriodConfig) => void;
  onDelete: (p: BillingPeriodConfig) => void;
}

function SortableTableRow({ period, getBillingLogicLabel, onEdit, onDelete }: SortableTableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: period.code });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { opacity: 0.8, backgroundColor: 'hsl(var(--muted))', position: 'relative', zIndex: 10 } as const : {}),
  } as React.CSSProperties;

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-[40px] pr-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </Button>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="font-mono">
          {period.code}
        </Badge>
      </TableCell>
      <TableCell className="font-medium">
        {period.label}
        {period.isBuiltIn && (
          <span className="ml-2 text-xs text-muted-foreground">(built-in)</span>
        )}
      </TableCell>
      <TableCell>
        <div
          className="w-8 h-8 rounded border"
          style={{ backgroundColor: `#${period.color.excelBg}` }}
          title={`Excel: #${period.color.excelBg}`}
        />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {getBillingLogicLabel(period)}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(period)}
            title="Edit Period"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {!period.isBuiltIn && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(period)}
              className="text-destructive hover:text-destructive"
              title="Delete Period"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function PeriodSettingsCard() {
  const { allPeriods, addPeriod, updatePeriod, deletePeriod, isCodeAvailable, reorderPeriods } = useBillingPeriods();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<BillingPeriodConfig | null>(null);
  const [deleteConfirmPeriod, setDeleteConfirmPeriod] = useState<BillingPeriodConfig | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAdd = () => {
    setEditingPeriod(null);
    setDialogOpen(true);
  };

  const handleEdit = (period: BillingPeriodConfig) => {
    setEditingPeriod(period);
    setDialogOpen(true);
  };

  const handleSave = (period: Omit<BillingPeriodConfig, 'isBuiltIn'>) => {
    if (editingPeriod) {
      updatePeriod(editingPeriod.code, period);
    } else {
      addPeriod(period);
    }
    setDialogOpen(false);
    setEditingPeriod(null);
  };

  const handleDelete = () => {
    if (deleteConfirmPeriod) {
      deletePeriod(deleteConfirmPeriod.code);
      setDeleteConfirmPeriod(null);
    }
  };

  const getBillingLogicLabel = (period: BillingPeriodConfig): string => {
    const labels: string[] = [];
    if (period.billingLogic.monthly) labels.push('Monthly');
    if (period.billingLogic.quarterly) labels.push('Quarterly');
    if (period.billingLogic.halfYearly) labels.push('Half-Yearly');
    if (period.billingLogic.yearly) labels.push('Yearly');
    if (period.billingLogic.biMonthly) labels.push('Bi-Monthly');
    return labels.join(', ') || 'None';
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = allPeriods.findIndex((p) => p.code === active.id);
      const newIndex = allPeriods.findIndex((p) => p.code === over.id);
      const newOrder = arrayMove(allPeriods, oldIndex, newIndex);
      reorderPeriods(newOrder);
    }
  };

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Period Settings</CardTitle>
                <CardDescription>Configure billing periods for Excel exports</CardDescription>
              </div>
            </div>
            <Button onClick={handleAdd} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Period
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[80px]">Code</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead className="w-[80px]">Color</TableHead>
                    <TableHead>Billing Logic</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={allPeriods.map((p) => p.code)}
                    strategy={verticalListSortingStrategy}
                  >
                    {allPeriods.map((period) => (
                      <SortableTableRow
                        key={period.code}
                        period={period}
                        getBillingLogicLabel={getBillingLogicLabel}
                        onEdit={handleEdit}
                        onDelete={(p) => setDeleteConfirmPeriod(p)}
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          </div>
        </CardContent>
      </Card>

      <PeriodDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        period={editingPeriod}
        onSave={handleSave}
        isCodeAvailable={editingPeriod ? () => true : isCodeAvailable}
      />

      <AlertDialog open={!!deleteConfirmPeriod} onOpenChange={() => setDeleteConfirmPeriod(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Period?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{deleteConfirmPeriod?.label}" period?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}