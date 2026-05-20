import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from './ConfirmModal';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

describe('ConfirmModal', () => {
  it('renders title and children when open', () => {
    render(<ConfirmModal title="Delete?" isOpen onConfirm={jest.fn()} onCancel={jest.fn()}>Are you sure?</ConfirmModal>);
    expect(screen.getByText('Delete?')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = jest.fn();
    render(<ConfirmModal title="Test" isOpen onConfirm={onConfirm} onCancel={jest.fn()} confirmLabel="Yes">body</ConfirmModal>);
    fireEvent.click(screen.getByText('Yes'));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when cancel clicked', () => {
    const onCancel = jest.fn();
    render(<ConfirmModal title="Test" isOpen onConfirm={jest.fn()} onCancel={onCancel}>body</ConfirmModal>);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    render(<ConfirmModal title="Hidden" isOpen={false} onConfirm={jest.fn()} onCancel={jest.fn()}>body</ConfirmModal>);
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });
});
