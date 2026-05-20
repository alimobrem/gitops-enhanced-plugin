import React from 'react';
import type { FC, PropsWithChildren } from 'react';
import { InstanceProvider } from './InstanceProvider';

export const GitOpsContextProvider: FC<PropsWithChildren> = ({ children }) => (
  <InstanceProvider>{children}</InstanceProvider>
);

export default GitOpsContextProvider;
