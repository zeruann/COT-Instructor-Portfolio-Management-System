import { ChevronDown } from 'lucide-react';

/**
 * Native select with a consistent, properly spaced chevron on the right.
 * `className` is appended to the select itself.
 */
export default function SelectField({ className = '', children, ...props }) {
  return (
    <div className="relative mt-1">
      <select
        {...props}
        className={`w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-10 ${className}`}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
    </div>
  );
}
