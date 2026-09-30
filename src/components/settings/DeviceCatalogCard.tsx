import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Check, X, Pencil, Plus, Trash2, Layers, Printer, Monitor } from 'lucide-react';
import { useDeviceCatalog } from '@/hooks/useDeviceCatalog';
import { ContractCategory } from '@/types/contracts';
import { cn } from '@/lib/utils';

interface CatalogManagerProps {
  category: ContractCategory;
}

/**
 * Two-level catalog manager: Top level (Brand / Device Type) -> second level (Models).
 * Writes are only possible for super admins; everyone else sees a read-only list.
 */
function CatalogManager({ category }: CatalogManagerProps) {
  const {
    brands,
    models,
    addBrand,
    renameBrand,
    deleteBrand,
    addModel,
    renameModel,
    deleteModel,
    canManage,
    isLoading,
  } = useDeviceCatalog(category);

  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ type: 'brand' | 'model'; id: string; name: string } | null>(null);

  const topLabel = category === 'copier' ? 'Brand' : 'Device Type';
  const showWrites = canManage;

  // Always keep a valid brand selected
  useEffect(() => {
    if (brands.length === 0) {
      if (selectedBrandId) setSelectedBrandId(null);
      return;
    }
    if (!selectedBrandId || !brands.some(b => b.id === selectedBrandId)) {
      setSelectedBrandId(brands[0].id);
    }
  }, [brands, selectedBrandId]);

  const selectedBrand = useMemo(
    () => brands.find(b => b.id === selectedBrandId) || null,
    [brands, selectedBrandId]
  );

  const selectedModels = useMemo(
    () => models.filter(m => m.brandId === selectedBrandId),
    [models, selectedBrandId]
  );

  const handleAddBrand = async () => {
    const name = newBrand.trim();
    if (!name) return;
    await addBrand(name);
    setNewBrand('');
  };

  const handleAddModel = async () => {
    const name = newModel.trim();
    if (!name || !selectedBrandId) return;
    await addModel(selectedBrandId, name);
    setNewModel('');
  };

  const startEdit = (id: string, value: string) => {
    setEditingId(id);
    setEditingValue(value);
  };

  const commitEdit = async (type: 'brand' | 'model') => {
    const value = editingValue.trim();
    if (!value || !editingId) {
      setEditingId(null);
      return;
    }
    if (type === 'brand') await renameBrand(editingId, value);
    else await renameModel(editingId, value);
    setEditingId(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === 'brand') await deleteBrand(pendingDelete.id);
    else await deleteModel(pendingDelete.id);
    setPendingDelete(null);
  };

  // ---------------------------------------------------------------------------
  // Rows
  // ---------------------------------------------------------------------------
  const renderRow = (id: string, name: string, type: 'brand' | 'model', isActive = false, onClick?: () => void) => (
    <div
      key={id}
      onClick={onClick}
      className={cn(
        'group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors',
        onClick && 'cursor-pointer',
        isActive ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/40 border border-transparent'
      )}
    >
      {editingId === id ? (
        <div className="flex flex-1 items-center gap-1">
          <Input
            autoFocus
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit(type);
              if (e.key === 'Escape') setEditingId(null);
            }}
            className="h-7 text-sm"
          />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => commitEdit(type)} title="Save">
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)} title="Cancel">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <span className="truncate text-sm">{name}</span>
          {showWrites && (
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title={`Rename ${topLabel.toLowerCase()}`}
                onClick={(e) => {
                  e.stopPropagation();
                  startEdit(id, name);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingDelete({ type, id, name });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Level 1: brands / device types */}
        <div className="rounded-lg border overflow-hidden">
          <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
            <span className="text-sm font-medium">{topLabel}s</span>
            <Badge variant="outline" className="text-[10px]">{brands.length}</Badge>
          </div>

          <div className="max-h-[320px] overflow-y-auto p-2 space-y-1">
            {brands.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                {isLoading ? 'Loading…' : `No ${topLabel.toLowerCase()}s yet.`}
              </p>
            ) : (
              brands.map((brand) =>
                renderRow(brand.id, brand.name, 'brand', brand.id === selectedBrandId, () => setSelectedBrandId(brand.id))
              )
            )}
          </div>

          {showWrites && (
            <div className="flex items-center gap-2 border-t p-2">
              <Input
                placeholder={`New ${topLabel.toLowerCase()}…`}
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddBrand()}
                className="h-8 text-sm"
              />
              <Button size="sm" className="h-8" onClick={handleAddBrand} disabled={!newBrand.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Level 2: models of the selected brand */}
        <div className="rounded-lg border overflow-hidden">
          <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
            <span className="text-sm font-medium">
              Models{selectedBrand ? <> · <span className="text-muted-foreground">{selectedBrand.name}</span></> : ''}
            </span>
            <Badge variant="outline" className="text-[10px]">{selectedModels.length}</Badge>
          </div>

          <div className="max-h-[320px] overflow-y-auto p-2 space-y-1">
            {!selectedBrand ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Select a {topLabel.toLowerCase()} to manage its models.
              </p>
            ) : selectedModels.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">No models yet.</p>
            ) : (
              selectedModels.map((model) => renderRow(model.id, model.name, 'model'))
            )}
          </div>

          {showWrites && (
            <div className="flex items-center gap-2 border-t p-2">
              <Input
                placeholder="New model…"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddModel()}
                disabled={!selectedBrand}
                className="h-8 text-sm"
              />
              <Button size="sm" className="h-8" onClick={handleAddModel} disabled={!newModel.trim() || !selectedBrand}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {!showWrites && (
        <p className="text-sm text-muted-foreground">
          Only super administrators can add, rename or delete catalog entries.
        </p>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDelete} onOpenChange={() => setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{pendingDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.type === 'brand'
                ? 'Deleting this entry also removes all of its models. This action cannot be undone.'
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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

/**
 * Device Catalog settings card.
 * Global (shared) catalog used by the brand/device-type -> model selects in the
 * contract forms. Copiers and Other Devices are managed in separate tabs.
 */
export function DeviceCatalogCard() {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Device Catalog</CardTitle>
            <CardDescription>
              Shared brands / device types and models used across all contracts
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="copier">
          <TabsList>
            <TabsTrigger value="copier" className="gap-2">
              <Printer className="h-4 w-4" />
              Copiers
            </TabsTrigger>
            <TabsTrigger value="other" className="gap-2">
              <Monitor className="h-4 w-4" />
              Other Devices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="copier" className="mt-4">
            <CatalogManager category="copier" />
          </TabsContent>

          <TabsContent value="other" className="mt-4">
            <CatalogManager category="other" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
