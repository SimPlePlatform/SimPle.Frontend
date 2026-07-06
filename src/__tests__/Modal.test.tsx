import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Modal } from '@/components/ui/Modal';

// next/link and Icon aren't needed for these tests — stub them
vi.mock('next/link', () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Modal', () => {
  it('does not render when open=false', () => {
    render(<Modal open={false} onClose={vi.fn()}>Content</Modal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders children when open=true', () => {
    render(<Modal open={true} onClose={vi.fn()}>Hello Modal</Modal>);
    expect(screen.getByText('Hello Modal')).toBeInTheDocument();
  });

  it('dialog has role=dialog and aria-modal=true', () => {
    render(<Modal open={true} onClose={vi.fn()} title="Test">Content</Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('aria-labelledby points to element containing the title text', () => {
    render(<Modal open={true} onClose={vi.fn()} title="Add Friend">Content</Modal>);
    const dialog = screen.getByRole('dialog');
    const labelledById = dialog.getAttribute('aria-labelledby');
    expect(labelledById).toBeTruthy();
    const titleEl = document.getElementById(labelledById!);
    expect(titleEl).not.toBeNull();
    expect(titleEl!.textContent).toBe('Add Friend');
  });

  it('aria-labelledby absent when no title provided', () => {
    render(<Modal open={true} onClose={vi.fn()}>No title</Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toHaveAttribute('aria-labelledby');
  });

  it('dialog has tabIndex=-1 as fallback focus target', () => {
    render(<Modal open={true} onClose={vi.fn()} title="Test">Content</Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('tabIndex', '-1');
  });

  it('two Modal instances render distinct aria-labelledby IDs', () => {
    render(
      <>
        <Modal open={true} title="Modal A" onClose={vi.fn()}>A</Modal>
        <Modal open={true} title="Modal B" onClose={vi.fn()}>B</Modal>
      </>,
    );
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(2);
    const idA = dialogs[0].getAttribute('aria-labelledby');
    const idB = dialogs[1].getAttribute('aria-labelledby');
    expect(idA).toBeTruthy();
    expect(idB).toBeTruthy();
    expect(idA).not.toBe(idB);
  });

  it('Escape key calls onClose', () => {
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose} title="Test">Content</Modal>);
    act(() => { fireEvent.keyDown(window, { key: 'Escape' }); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking backdrop calls onClose', () => {
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose} title="Test">Content</Modal>);
    const backdrop = document.querySelector('.modal-backdrop')!;
    act(() => { fireEvent.click(backdrop); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking inside modal does not call onClose', () => {
    const onClose = vi.fn();
    render(<Modal open={true} onClose={onClose} title="Test">Inner</Modal>);
    act(() => { fireEvent.click(screen.getByText('Inner')); });
    expect(onClose).not.toHaveBeenCalled();
  });
});
