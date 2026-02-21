import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { BillingPeriodConfig } from '@/types/contracts';

interface PeriodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  period: BillingPeriodConfig | null;
  onSave: (period: Omit<BillingPeriodConfig, 'isBuiltIn'>) => void;
  isCodeAvailable: (code: string) => boolean;
}

export function PeriodDialog({
  open,
  onOpenChange,
  period,
  onSave,
  isCodeAvailable,
}: PeriodDialogProps) {
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [selectedColor, setSelectedColor] = useState({
    excelBg: '4472C4',
    excelText: 'FFFFFF'
  });
  const [billingLogic, setBillingLogic] = useState({
    monthly: false,
    quarterly: false,
    halfYearly: false,
    yearly: false,
    biMonthly: false,
  });
  const [codeError, setCodeError] = useState('');

  const isEditing = !!period;

  useEffect(() => {
    if (open) {
      if (period) {
        setCode(period.code);
        setLabel(period.label);
        setSelectedColor({
          excelBg: period.color.excelBg || '4472C4',
          excelText: period.color.excelText || 'FFFFFF'
        });
        setBillingLogic({ ...period.billingLogic });
      } else {
        setCode('');
        setLabel('');
        setSelectedColor({ excelBg: '4472C4', excelText: 'FFFFFF' });
        setBillingLogic({
          monthly: false,
          quarterly: false,
          halfYearly: false,
          yearly: false,
          biMonthly: false,
        });
      }
      setCodeError('');
    }
  }, [open, period]);

  const handleCodeChange = (value: string) => {
    const upperValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCode(upperValue);

    if (upperValue && !isEditing && !isCodeAvailable(upperValue)) {
      setCodeError('This code is already in use');
    } else {
      setCodeError('');
    }
  };

  const handleSave = () => {
    if (!code || !label) return;
    if (!isEditing && !isCodeAvailable(code)) return;

    const bgHex = selectedColor.excelBg.replace('#', '');
    const txtHex = selectedColor.excelText.replace('#', '');

    onSave({
      code,
      label,
      color: {
        bg: `bg-[#${bgHex}]/20`,
        text: `text-[#${bgHex}]`,
        excelBg: bgHex,
        excelText: txtHex,
      },
      billingLogic,
    });
  };

  const toggleLogic = (key: keyof typeof billingLogic) => {
    setBillingLogic(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isValid = code.length >= 2 && label.length >= 2 && !codeError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit Period: ${period.code}` : 'Add New Period'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Code */}
          <div className="grid gap-2">
            <Label htmlFor="code">Period Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="e.g., CUST1"
              maxLength={8}
              disabled={isEditing && period?.isBuiltIn}
              className="font-mono uppercase"
            />
            {codeError && <p className="text-sm text-destructive">{codeError}</p>}
            {isEditing && period?.isBuiltIn && (
              <p className="text-sm text-muted-foreground">Built-in codes cannot be changed</p>
            )}
          </div>

          {/* Label */}
          <div className="grid gap-2">
            <Label htmlFor="label">Label / Description</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Custom Monthly + Weekly"
            />
          </div>

          {/* Color */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="excelBg">Background Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="excelBg"
                  type="color"
                  value={`#${selectedColor.excelBg.replace('#', '')}`}
                  onChange={(e) => setSelectedColor(prev => ({ ...prev, excelBg: e.target.value }))}
                  className="w-12 h-12 p-1 cursor-pointer"
                />
                <span className="font-mono text-sm uppercase">#{selectedColor.excelBg.replace('#', '')}</span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="excelText">Text Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="excelText"
                  type="color"
                  value={`#${selectedColor.excelText.replace('#', '')}`}
                  onChange={(e) => setSelectedColor(prev => ({ ...prev, excelText: e.target.value }))}
                  className="w-12 h-12 p-1 cursor-pointer"
                />
                <span className="font-mono text-sm uppercase">#{selectedColor.excelText.replace('#', '')}</span>
              </div>
            </div>
          </div>

          {/* Billing Logic */}
          <div className="grid gap-3">
            <Label>Billing Logic</Label>
            <p className="text-sm text-muted-foreground">
              Select when invoices are generated for this period type
            </p>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="monthly"
                  checked={billingLogic.monthly}
                  onCheckedChange={() => toggleLogic('monthly')}
                />
                <Label htmlFor="monthly" className="font-normal cursor-pointer">
                  Monthly (all 12 months)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="quarterly"
                  checked={billingLogic.quarterly}
                  onCheckedChange={() => toggleLogic('quarterly')}
                />
                <Label htmlFor="quarterly" className="font-normal cursor-pointer">
                  Quarterly (uses Quarterly Months schedule)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="halfYearly"
                  checked={billingLogic.halfYearly}
                  onCheckedChange={() => toggleLogic('halfYearly')}
                />
                <Label htmlFor="halfYearly" className="font-normal cursor-pointer">
                  Half-Yearly (Jan & Jul)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="yearly"
                  checked={billingLogic.yearly}
                  onCheckedChange={() => toggleLogic('yearly')}
                />
                <Label htmlFor="yearly" className="font-normal cursor-pointer">
                  Yearly (Jan only)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="biMonthly"
                  checked={billingLogic.biMonthly}
                  onCheckedChange={() => toggleLogic('biMonthly')}
                />
                <Label htmlFor="biMonthly" className="font-normal cursor-pointer">
                  Bi-Monthly (odd months: Jan, Mar, May...)
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {isEditing ? 'Save Changes' : 'Add Period'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}