import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConditionsBanner } from './ConditionsBanner';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));

describe('ConditionsBanner', () => {
  it('renders nothing when conditions is undefined', () => {
    const { container } = render(<ConditionsBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when conditions is empty', () => {
    const { container } = render(<ConditionsBanner conditions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a single alert for one condition', () => {
    render(
      <ConditionsBanner
        conditions={[{ type: 'ComparisonError', message: 'failed to compare' }]}
      />,
    );
    expect(screen.getByText('ComparisonError')).toBeInTheDocument();
    expect(screen.getByText('failed to compare')).toBeInTheDocument();
  });

  it('renders two alerts for two conditions', () => {
    render(
      <ConditionsBanner
        conditions={[
          { type: 'ComparisonError', message: 'err1' },
          { type: 'OrphanedResourceWarning', message: 'err2' },
        ]}
      />,
    );
    expect(screen.getByText('ComparisonError')).toBeInTheDocument();
    expect(screen.getByText('OrphanedResourceWarning')).toBeInTheDocument();
  });

  it('renders collapsed alert with expandable list for 3+ conditions', () => {
    render(
      <ConditionsBanner
        conditions={[
          { type: 'ComparisonError', message: 'e1' },
          { type: 'SyncError', message: 'e2' },
          { type: 'OrphanedResourceWarning', message: 'e3' },
          { type: 'ExcludedResourceWarning', message: 'e4' },
        ]}
      />,
    );
    expect(screen.getByText('{{count}} conditions detected')).toBeInTheDocument();
    expect(screen.getByText('Show details')).toBeInTheDocument();
  });

  it('maps ComparisonError to danger variant', () => {
    const { container } = render(
      <ConditionsBanner
        conditions={[{ type: 'ComparisonError', message: 'x' }]}
      />,
    );
    const alert = container.querySelector('.pf-v6-c-alert');
    expect(alert?.classList.toString()).toMatch(/danger/);
  });

  it('maps OrphanedResourceWarning to warning variant', () => {
    const { container } = render(
      <ConditionsBanner
        conditions={[{ type: 'OrphanedResourceWarning', message: 'x' }]}
      />,
    );
    const alert = container.querySelector('.pf-v6-c-alert');
    expect(alert?.classList.toString()).toMatch(/warning/);
  });
});
