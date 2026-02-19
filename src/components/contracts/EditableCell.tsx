import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: string | number;
  onSave: (value: string | number) => void;
  type?: 'text' | 'number' | 'currency' | 'date';
  className?: string;
  displayValue?: string;
}

export function EditableCell({ value, onSave, type = 'text', className, displayValue }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(String(value));
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    let finalValue: string | number = editValue;

    if (type === 'number' || type === 'currency') {
      finalValue = parseFloat(editValue) || 0;
    }

    if (finalValue !== value) {
      onSave(finalValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(String(value));
      setIsEditing(false);
    }
  };

  const formatDisplay = () => {
    if (displayValue !== undefined) {
      return displayValue;
    }
    if (type === 'currency') {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
      }).format(Number(value));
    }
    if (type === 'date' && value) {
      return new Date(String(value)).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    return value || '-';
  };

  const getInputType = () => {
    if (type === 'date') return 'date';
    if (type === 'number' || type === 'currency') return 'number';
    return 'text';
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type={getInputType()}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn("h-8 w-full min-w-[60px]", className)}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer px-2 py-1 rounded-md min-h-[32px] flex items-center",
        "hover:bg-primary/10 hover:ring-1 hover:ring-primary/30 transition-all",
        "group relative",
        className
      )}
      title="Click to edit"
    >
      <span>{formatDisplay()}</span>
    </div>
  );
}
