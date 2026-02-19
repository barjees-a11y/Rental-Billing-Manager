import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface EditableSelectProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onSave: (value: T) => void;
  variant?: 'default' | 'badge';
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

export function EditableSelect<T extends string>({
  value,
  options,
  onSave,
  variant = 'default',
  badgeVariant = 'secondary',
  className
}: EditableSelectProps<T>) {
  const [isEditing, setIsEditing] = useState(false);

  const handleChange = (newValue: T) => {
    onSave(newValue);
    setIsEditing(false);
  };

  const currentLabel = options.find(o => o.value === value)?.label || value;

  if (isEditing) {
    return (
      <Select
        value={value}
        onValueChange={(v) => handleChange(v as T)}
        onOpenChange={(open) => !open && setIsEditing(false)}
        defaultOpen
      >
        <SelectTrigger className={cn("h-8 min-w-[100px]", className)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (variant === 'badge') {
    return (
      <Badge
        variant={badgeVariant}
        onClick={() => setIsEditing(true)}
        className="cursor-pointer transition-all"
        title="Click to change"
      >
        {currentLabel}
      </Badge>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer px-2 py-1 rounded-md min-h-[32px] flex items-center",
        "transition-all",
        className
      )}
      title="Click to change"
    >
      {currentLabel}
    </div>
  );
}
