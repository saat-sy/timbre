"use client";

import { type JSX, forwardRef } from "react";
import { cn } from "./utils";

export interface GradientButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

const variantStyles = {
  primary: [
    'bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary',
    'hover:brightness-110 transition-all duration-300',
    'text-white shadow-lg shadow-accent-primary/25',
    'border border-white/20'
  ].join(' '),
  secondary: [
    'bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700',
    'hover:from-slate-600 hover:via-slate-500 hover:to-slate-600',
    'text-white shadow-lg shadow-slate-500/25',
    'border border-white/10'
  ].join(' '),
  ghost: [
    'bg-white/5 hover:bg-white/10',
    'text-white border border-white/20',
    'hover:border-white/30 shadow-lg shadow-white/5'
  ].join(' ')
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-base rounded-xl',
  lg: 'px-6 py-3 text-lg rounded-2xl'
};

const LoadingSpinner = ({ size }: { size: 'sm' | 'md' | 'lg' }) => {
  const spinnerSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className={cn(
      "animate-spin rounded-full border-2 border-white/30 border-t-white",
      spinnerSize[size]
    )} />
  );
};

export const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    onClick,
    type = 'button',
    ...props
  }, ref): JSX.Element => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        onClick={onClick}
        className={cn(
          // Base styles
          'relative overflow-hidden font-medium transition-all duration-300 ease-in-out',
          'backdrop-blur-md transform-gpu',
          'focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-transparent',

          // Size styles
          sizeStyles[size],

          // Variant styles
          variantStyles[variant],

          // Interactive states
          !isDisabled && [
            'hover:scale-105 hover:shadow-xl',
            'active:scale-95 active:transition-transform active:duration-75',
            'cursor-pointer'
          ],

          // Disabled state
          isDisabled && [
            'opacity-50 cursor-not-allowed',
            'hover:scale-100 hover:shadow-lg'
          ],

          className
        )}
        {...props}
      >
        {/* Glass morphism overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-inherit" />

        {/* Content */}
        <div className="relative flex items-center justify-center gap-2">
          {loading && <LoadingSpinner size={size} />}
          <span className={cn(loading && "opacity-75")}>
            {children}
          </span>
        </div>

        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
      </button>
    );
  }
);

GradientButton.displayName = "GradientButton";
