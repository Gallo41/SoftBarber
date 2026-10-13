import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'outline' | 'danger' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-pole-red hover:bg-pole-red-dark text-card border-[1.5px] border-ink shadow-stamp-sm active:shadow-none active:translate-x-[2px] active:translate-y-[2px] focus-visible:ring-pole-red',
  outline:
    'bg-transparent border-[1.5px] border-ink text-ink hover:bg-paper-dark focus-visible:ring-ink',
  danger:
    'bg-card border-[1.5px] border-pole-red text-pole-red hover:bg-pole-red hover:text-card focus-visible:ring-pole-red',
  secondary:
    'bg-paper-dark hover:bg-paper-deep text-ink border-[1.5px] border-ink focus-visible:ring-ink',
  ghost:
    'text-ink-soft hover:text-ink hover:bg-paper-dark focus-visible:ring-ink',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-3 text-base gap-2.5',
};

const iconSizes: Record<ButtonSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled = false,
      className = '',
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isButtonDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isButtonDisabled}
        className={`
          inline-flex items-center justify-center rounded-sm
          font-sign uppercase tracking-[0.08em] font-medium
          transition-all duration-150 ease-in-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-paper
          disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
          select-none
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...rest}
      >
        {isLoading ? (
          <>
            <Loader2
              size={iconSizes[size]}
              className="animate-spin shrink-0 text-current"
            />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
