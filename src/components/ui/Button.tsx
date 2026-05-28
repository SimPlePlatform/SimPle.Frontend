'use client';
import React from 'react';
import { Icon } from './Icons';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconRight?: string;
  children?: React.ReactNode;
}

export function Button({
  variant = 'primary', size = 'md', icon, iconRight,
  children, className = '', ...props
}: ButtonProps) {
  const cls = [
    'btn',
    variant === 'primary'   ? 'btn-primary'   :
    variant === 'ghost'     ? 'btn-ghost'      :
                              'btn-secondary',
    size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '',
    !children ? 'btn-icon' : '',
    className,
  ].filter(Boolean).join(' ');

  const iconSize = size === 'sm' ? 14 : 16;

  return (
    <button className={cls} {...props}>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={iconSize} />}
    </button>
  );
}
