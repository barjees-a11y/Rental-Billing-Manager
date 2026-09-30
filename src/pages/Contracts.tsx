import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileText, Monitor } from 'lucide-react';
import { ContractCategory } from '@/types/contracts';
import { useContracts } from '@/hooks/useContracts';
import { ContractListSection } from '@/components/contracts/ContractListSection';

/**
 * Billing page.
 *
 * Route stays `/contracts` (bookmarks keep working) but the page is now split
 * into two independent lists: copier rental contracts (legacy behaviour) and
 * the new "other device" contracts.
 */
export default function Contracts() {
  const [category, setCategory] = useState<ContractCategory>('copier');
  const { copierStats, otherStats } = useContracts();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Manage copier rental contracts and other device contracts
        </p>
      </div>

      {/* Category Tabs */}
      <Tabs
        value={category}
        onValueChange={(v) => setCategory(v as ContractCategory)}
      >
        <TabsList>
          <TabsTrigger value="copier" className="gap-2">
            <FileText className="h-4 w-4" />
            Copier Contracts
            <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1">
              {copierStats.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="other" className="gap-2">
            <Monitor className="h-4 w-4" />
            Other Contracts
            <Badge variant="secondary" className="ml-1 h-4 text-[10px] px-1">
              {otherStats.total}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="copier" className="mt-4">
          <ContractListSection category="copier" />
        </TabsContent>

        <TabsContent value="other" className="mt-4">
          <ContractListSection category="other" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
