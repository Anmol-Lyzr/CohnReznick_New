"use client";

import { FormField, FormSelect } from "@/components/journey-layout";

interface EngagementNameSelectProps {
  value: string;
  onChange: (name: string) => void;
  names: string[];
}

export function EngagementNameSelect({ value, onChange, names }: EngagementNameSelectProps) {
  return (
    <FormField label="Engagement Name" required>
      <FormSelect value={value} onChange={(e) => onChange(e.target.value)}>
        {names.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </FormSelect>
    </FormField>
  );
}
