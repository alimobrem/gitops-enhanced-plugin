import React from 'react';
import { useState, type FC } from 'react';
import { Alert, type AlertProps } from '@patternfly/react-core';

interface DismissibleAlertProps {
  variant: AlertProps['variant'];
  title: string;
  children?: React.ReactNode;
}

export const DismissibleAlert: FC<DismissibleAlertProps> = ({ variant, title, children }) => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <Alert
      variant={variant}
      isInline
      title={title}
      actionClose={<button onClick={() => setDismissed(true)} aria-label="Close">x</button>}
      className="pf-v6-u-mb-md"
    />
  );
};
