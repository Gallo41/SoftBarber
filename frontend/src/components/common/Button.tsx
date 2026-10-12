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
    'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-zinc-950 font-semibold focus:ring-amber-400 shadow-sm shadow-amber-500/10',
  outline:
    'border border-zinc-700 hover:border-amber-500/80 hover:bg-zinc-800/60 text-zinc-200 hover:text-amber-400 focus:ring-amber-400',
  danger:
    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium focus:ring-red-500 shadow-sm shadow-red-600/10',
  secondary:
    'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-100 font-medium focus:ring-zinc-600 border border-zinc-700/60',
  ghost:
    'text-zinc-300 hover:text-white hover:bg-zinc-800/60 active:bg-zinc-800 focus:ring-zinc-600',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-md',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'px-5 py-2.5 text-base gap-2.5 rounded-xl',
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
          inline-flex items-center justify-center
          transition-all duration-150 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950
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
