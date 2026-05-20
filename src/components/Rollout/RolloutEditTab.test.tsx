import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockK8sPatch = jest.fn();

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  k8sPatch: (...args: unknown[]) => mockK8sPatch(...args),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string, o?: Record<string, string>) => o ? Object.entries(o).reduce((a, [k, v]) => a.replace(`{{${k}}}`, v), s) : s }) }));

import { RolloutEditTab } from './RolloutEditTab';

const mockRollout = {
  metadata: { name: 'demo', namespace: 'guestbook', uid: '1' },
  spec: { replicas: 3, template: { spec: { containers: [{ name: 'app', image: 'nginx:latest' }] } } },
};

describe('RolloutEditTab', () => {
  beforeEach(() => mockK8sPatch.mockReset().mockResolvedValue({}));

  it('renders replicas and image fields', () => {
    render(<RolloutEditTab rollout={mockRollout} />);
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('nginx:latest')).toBeInTheDocument();
  });

  it('Save is disabled when form is clean', () => {
    render(<RolloutEditTab rollout={mockRollout} />);
    expect(screen.getByText('Save').closest('button')).toBeDisabled();
  });

  it('Save enables when image changes', () => {
    render(<RolloutEditTab rollout={mockRollout} />);
    fireEvent.change(screen.getByDisplayValue('nginx:latest'), { target: { value: 'nginx:1.25' } });
    expect(screen.getByText('Save').closest('button')).not.toBeDisabled();
  });

  it('Cancel resets form', () => {
    render(<RolloutEditTab rollout={mockRollout} />);
    fireEvent.change(screen.getByDisplayValue('nginx:latest'), { target: { value: 'changed' } });
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByDisplayValue('nginx:latest')).toBeInTheDocument();
  });

  it('calls k8sPatch on save confirm', async () => {
    render(<RolloutEditTab rollout={mockRollout} />);
    fireEvent.change(screen.getByDisplayValue('nginx:latest'), { target: { value: 'nginx:1.25' } });
    fireEvent.click(screen.getByText('Save'));
    fireEvent.click(screen.getAllByText('Save')[1]);
    await waitFor(() => expect(mockK8sPatch).toHaveBeenCalled());
  });
});
