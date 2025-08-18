'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from './checkbox';
import { Label } from './label';
import { ScrollArea } from './scroll-area';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  className?: string;
  placeholder?: string;
}

function MultiSelect({
  options,
  selected,
  onChange,
  className,
  placeholder = 'Select options...',
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="multi-select-trigger"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-auto min-h-10", className)}
          onClick={() => setOpen(!open)}
        >
          <div className="flex flex-wrap gap-1">
            {selected.length > 0 ? (
              selected.map((item) => (
                <Badge
                  variant="secondary"
                  key={item}
                  className="mr-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnselect(item);
                  }}
                >
                  {options.find(opt => opt.value === item)?.label ?? item}
                  <X className="h-3 w-3 ml-1 text-muted-foreground hover:text-foreground" />
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent id="multi-select-popover-content" className="w-[--radix-popover-trigger-width] p-0">
        <ScrollArea className="max-h-72">
            <div className="p-4">
                <div className="space-y-2">
                    {options.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                             <Checkbox
                                id={`accessory-${option.value}`}
                                checked={selected.includes(option.value)}
                                onCheckedChange={(checked) => {
                                    return checked
                                    ? onChange([...selected, option.value])
                                    : onChange(selected.filter((value) => value !== option.value))
                                }}
                            />
                            <Label htmlFor={`accessory-${option.value}`} className="font-normal w-full cursor-pointer">
                                {option.label}
                            </Label>
                        </div>
                    ))}
                    {options.length === 0 && (
                         <p className="text-center text-sm text-muted-foreground p-2">No accessories found.</p>
                    )}
                </div>
            </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export { MultiSelect };
export type { MultiSelectOption };
