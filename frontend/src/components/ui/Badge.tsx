import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './Button';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-gray-700 text-gray-100 hover:bg-gray-600',
        critical: 'border-red-500/20 bg-red-500/10 text-red-500',
        high: 'border-orange-500/20 bg-orange-500/10 text-orange-500',
        medium: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500',
        low: 'border-blue-500/20 bg-blue-500/10 text-blue-500',
        info: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400',
        outline: 'text-gray-300 border-gray-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
