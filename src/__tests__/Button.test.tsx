import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icons';

describe('Button', () => {
  it('renders primary variant by default', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  it('renders ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-ghost');
  });

  it('renders secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');
  });

  it('renders sm size with 14px icon', () => {
    render(<Button size="sm" icon="check">Small</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveClass('btn-sm');
  });

  it('applies btn-icon class when no children', () => {
    render(<Button icon="check" aria-label="check" />);
    expect(screen.getByRole('button')).toHaveClass('btn-icon');
  });

  it('renders left icon', () => {
    const { container } = render(<Button icon="check">With icon</Button>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders right icon', () => {
    const { container } = render(<Button iconRight="arrowRight">Next</Button>);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('Icon', () => {
  it('returns null for unknown icon name', () => {
    const { container } = render(<Icon name={'nonexistent' as never} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a known icon', () => {
    const { container } = render(<Icon name="check" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
