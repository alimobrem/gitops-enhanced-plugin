import React from 'react';
import { useState, type FC } from 'react';
import { Alert, AlertActionCloseButton, type AlertProps } from '@patternfly/react-core';

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
      actionClose={<AlertActionCloseButton onClose={() => setDismissed(true)} />}
      className="pf-v6-u-mb-md"
    >
      {children}
    </Alert>
  );
};
