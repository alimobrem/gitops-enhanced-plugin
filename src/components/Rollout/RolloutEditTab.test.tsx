import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockK8sPatch = jest.fn();

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  k8sPatch: (...args: unknown[]) => mockK8sPatch(...args),
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string, o?: Record<string, string>) => o ? Object.entries(o).reduce((a, [k, v]) => a.replace(`{{${k}}}`, v), s) : s }) }));

import { RolloutEditTab } from './RolloutEditTab';

const canaryRollout = {
  metadata: { name: 'demo', namespace: 'guestbook', uid: '1' },
  spec: {
    replicas: 3,
    revisionHistoryLimit: 5,
    strategy: {
      canary: {
        maxSurge: '25%',
        maxUnavailable: '0',
        stableService: 'demo-stable',
        canaryService: 'demo-canary',
        steps: [{ setWeight: 20 }, { pause: { duration: '30s' } }],
      },
    },
    template: { spec: { containers: [{ name: 'app', image: 'nginx:latest', ports: [{ containerPort: 80 }] }] } },
  },
};

const blueGreenRollout = {
  metadata: { name: 'bg-demo', namespace: 'default', uid: '2' },
  spec: {
    replicas: 2,
    strategy: {
      blueGreen: {
        activeService: 'bg-active',
        previewService: 'bg-preview',
        autoPromotionEnabled: false,
        autoPromotionSeconds: 60,
        scaleDownDelaySeconds: 30,
      },
    },
    template: { spec: { containers: [{ name: 'app', image: 'redis:7' }] } },
  },
};

describe('RolloutEditTab', () => {
  beforeEach(() => mockK8sPatch.mockReset().mockResolvedValue({}));

  it('renders basics fields', () => {
    render(<RolloutEditTab rollout={canaryRollout} />);
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
    expect(screen.getByDisplayValue('nginx:latest')).toBeInTheDocument();
    expect(screen.getByText('Revision History Limit')).toBeInTheDocument();
    expect(screen.getByText('Min Ready Seconds')).toBeInTheDocument();
  });

  it('shows canary fields for canary strategy', () => {
    render(<RolloutEditTab rollout={canaryRollout} />);
    expect(screen.getByText('Max Surge')).toBeInTheDocument();
    expect(screen.getByText('Max Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Stable Service')).toBeInTheDocument();
    expect(screen.getByText('Canary Service')).toBeInTheDocument();
    expect(screen.getByText('Canary Steps')).toBeInTheDocument();
  });

  it('does not show blueGreen fields for canary strategy', () => {
    render(<RolloutEditTab rollout={canaryRollout} />);
    expect(screen.queryByText('Active Service')).not.toBeInTheDocument();
    expect(screen.queryByText('Preview Service')).not.toBeInTheDocument();
  });

  it('shows blueGreen fields for blueGreen strategy', () => {
    render(<RolloutEditTab rollout={blueGreenRollout} />);
    expect(screen.getByText('Active Service')).toBeInTheDocument();
    expect(screen.getByText('Preview Service')).toBeInTheDocument();
    expect(screen.getByText('Auto Promotion')).toBeInTheDocument();
    expect(screen.getByText('Auto Promotion Seconds')).toBeInTheDocument();
    expect(screen.getByText('Scale Down Delay Seconds')).toBeInTheDocument();
  });

  it('does not show canary fields for blueGreen strategy', () => {
    render(<RolloutEditTab rollout={blueGreenRollout} />);
    expect(screen.queryByText('Max Surge')).not.toBeInTheDocument();
    expect(screen.queryByText('Canary Steps')).not.toBeInTheDocument();
  });

  it('Save is disabled when form is clean', () => {
    render(<RolloutEditTab rollout={canaryRollout} />);
    expect(screen.getByText('Save').closest('button')).toBeDisabled();
  });

  it('Save enables when image changes', () => {
    render(<RolloutEditTab rollout={canaryRollout} />);
    fireEvent.change(screen.getByDisplayValue('nginx:latest'), { target: { value: 'nginx:1.25' } });
    expect(screen.getByText('Save').closest('button')).not.toBeDisabled();
  });

  it('Revert resets form', () => {
    render(<RolloutEditTab rollout={canaryRollout} />);
    fireEvent.change(screen.getByDisplayValue('nginx:latest'), { target: { value: 'changed' } });
    fireEvent.click(screen.getByText('Revert'));
    expect(screen.getByDisplayValue('nginx:latest')).toBeInTheDocument();
  });

  it('calls k8sPatch on save confirm', async () => {
    render(<RolloutEditTab rollout={canaryRollout} />);
    fireEvent.change(screen.getByDisplayValue('nginx:latest'), { target: { value: 'nginx:1.25' } });
    fireEvent.click(screen.getByText('Save'));
    fireEvent.click(screen.getAllByText('Save')[1]);
    await waitFor(() => expect(mockK8sPatch).toHaveBeenCalled());
  });

  it('patch includes strategy fields', async () => {
    render(<RolloutEditTab rollout={canaryRollout} />);
    fireEvent.change(screen.getByDisplayValue('25%'), { target: { value: '50%' } });
    fireEvent.click(screen.getByText('Save'));
    fireEvent.click(screen.getAllByText('Save')[1]);
    await waitFor(() => {
      const call = mockK8sPatch.mock.calls[0][0];
      const paths = call.data.map((p: { path: string }) => p.path);
      expect(paths).toContain('/spec/strategy/canary/maxSurge');
    });
  });
});
