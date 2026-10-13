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
    'bg-slate-900 hover:bg-slate-800 text-white shadow-xs focus-visible:ring-slate-900',
  outline:
    'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs focus-visible:ring-slate-400',
  danger:
    'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 focus-visible:ring-rose-500',
  secondary:
    'bg-slate-100 hover:bg-slate-200 text-slate-700 focus-visible:ring-slate-400',
  ghost:
    'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 focus-visible:ring-slate-400',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-sm gap-2 rounded-xl',
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
          font-medium tracking-tight
          transition-all duration-150 ease-in-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
          select-none active:scale-[0.98]
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
              aria-hidden="true"
            />
            {loadingText ? <span>{loadingText}</span> : children}
          </>
        ) : (
          <>
            {leftIcon && (
              <span className="shrink-0 inline-flex items-center" aria-hidden="true">
                {leftIcon}
              </span>
            )}
            {children}
            {rightIcon && (
              <span className="shrink-0 inline-flex items-center" aria-hidden="true">
                {rightIcon}
              </span>
            )}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
