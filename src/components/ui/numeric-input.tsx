"use client";

import React, { forwardRef } from "react";

export interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string | number;
  onChange: (value: string) => void;
  allowNegative?: boolean;
  allowDecimal?: boolean;
}

export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, allowNegative = false, allowDecimal = true, className, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      
      // Replace comma with dot
      val = val.replace(/,/g, '.');
      
      // Strip invalid characters
      // Allow digits, one dot (if allowDecimal), one minus sign at start (if allowNegative)
      let sanitized = '';
      let hasDot = false;
      let hasMinus = false;
      
      for (let i = 0; i < val.length; i++) {
        const char = val[i];
        if (char === '-' && i === 0 && allowNegative) {
          hasMinus = true;
          sanitized += char;
        } else if (char === '.' && allowDecimal && !hasDot) {
          hasDot = true;
          sanitized += char;
        } else if (/[0-9]/.test(char)) {
          sanitized += char;
        }
      }
      
      sanitized = sanitized.replace(/^(-?)0+(?=\d)/, '$1');
      
      onChange(sanitized);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Prevent obviously bad characters for numbers
      if (['e', 'E', '+', 'p', 'P'].includes(e.key)) {
        e.preventDefault();
      }
      if (!allowNegative && e.key === '-') {
        e.preventDefault();
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (value === 0 || value === '0') {
        e.target.select();
      }
      props.onFocus?.(e);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-1p-ignore="true"
        data-lpignore="true"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        className={className}
        {...props}
      />
    );
  }
);
NumericInput.displayName = "NumericInput";
