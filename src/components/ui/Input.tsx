import { InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({
  label,
  error,
  className,
  id,
  required,
  ...props
}: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "w-full bg-gray-800 text-gray-100 border rounded-lg px-3 py-2.5 text-sm transition-colors",
          "placeholder:text-gray-500",
          "focus:outline-none focus:ring-2 focus:ring-green-500/50",
          error
            ? "border-red-500 focus:border-red-500"
            : "border-gray-700 focus:border-green-500",
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
