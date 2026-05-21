"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormField, FormInput } from "@/components/journey-layout";
import { toolbarControlClass } from "@/lib/toolbar-form";

export const NEW_CLIENT_OPTION_VALUE = "__new_client__";

interface ClientNameDropdownProps {
  value: string;
  onChange: (name: string) => void;
  names: string[];
  className?: string;
  /** Match parameters card field layout */
  variant?: "inline" | "field";
}

export function ClientNameDropdown({
  value,
  onChange,
  names,
  className,
  variant = "field",
}: ClientNameDropdownProps) {
  const isCustomName = Boolean(value && !names.includes(value));
  const [creatingNew, setCreatingNew] = useState(isCustomName);

  useEffect(() => {
    if (isCustomName) setCreatingNew(true);
  }, [isCustomName]);

  const selectValue = creatingNew && !isCustomName ? NEW_CLIENT_OPTION_VALUE : value;

  const handleSelectChange = (next: string) => {
    if (next === NEW_CLIENT_OPTION_VALUE) {
      setCreatingNew(true);
      onChange("");
      return;
    }
    setCreatingNew(false);
    onChange(next);
  };

  const select = creatingNew ? (
    <div className="flex min-w-0 flex-col gap-1.5">
      <FormInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter client name"
        aria-label="New client name"
        autoFocus
      />
      <button
        type="button"
        onClick={() => {
          setCreatingNew(false);
          onChange(names[0] ?? "");
        }}
        className="self-start text-[10px] font-medium text-primary hover:underline"
      >
        Choose existing client
      </button>
    </div>
  ) : (
    <div className="relative min-w-0">
      <select
        value={selectValue}
        onChange={(e) => handleSelectChange(e.target.value)}
        className={cn(toolbarControlClass, "appearance-none cursor-pointer pr-8 font-medium")}
        title="Select client"
        aria-label="Client"
      >
        {names.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
        <option value={NEW_CLIENT_OPTION_VALUE}>New client…</option>
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 flex-shrink-0", className)}>
        <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap hidden sm:inline">
          Client
        </span>
        {select}
      </div>
    );
  }

  return (
    <FormField label="Client" required className={cn("max-w-sm", className)}>
      {select}
    </FormField>
  );
}
