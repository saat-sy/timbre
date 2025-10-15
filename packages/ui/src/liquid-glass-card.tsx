import { type JSX } from "react";
import { cn } from "./utils";

export interface LiquidGlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'accent';
  blur?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  as?: 'div' | 'section' | 'article';
}

const variantStyles = {
  primary: 'liquid-glass-primary',
  secondary: 'liquid-glass-secondary', 
  accent: 'liquid-glass-accent',
};

const blurStyles = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
};

export function LiquidGlassCard({
  children,
  className,
  variant = 'primary',
  blur = 'md',
  onClick,
  onMouseEnter,
  onMouseLeave,
  as: Component = 'div',
}: LiquidGlassCardProps): JSX.Element {
  const baseStyles = variant === 'primary' || variant === 'secondary' || variant === 'accent' 
    ? variantStyles[variant]
    : 'liquid-glass';

  const combinedClassName = cn(
    baseStyles,
    blurStyles[blur],
    'transition-all duration-300 ease-in-out',
    onClick && 'cursor-pointer hover:bg-opacity-80 hover:border-opacity-30 hover:scale-[1.02]',
    className
  );

  return (
    <Component 
      className={combinedClassName}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </Component>
  );
}