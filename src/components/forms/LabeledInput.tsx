"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface LabeledInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number" | "date";
  placeholder?: string;
  required?: boolean;
  step?: string;
  className?: string;
  mono?: boolean;
}

/** Labeled, controlled input used across the scan forms and review dialogs. */
export function LabeledInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  step,
  className,
  mono = false,
}: LabeledInputProps) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-600"> *</span>}
      </Label>
      <Input
        id={id}
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(mono && "font-mono")}
      />
    </div>
  );
}
