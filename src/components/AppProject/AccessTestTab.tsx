import React, { useState } from 'react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bullseye, Spinner,
  Card, CardBody,
  Form, FormGroup,
  TextInput, Button, Alert,
  ExpandableSection,
} from '@patternfly/react-core';
import { FormSelect, FormSelectOption } from '@patternfly/react-core';
import { evaluateAccess } from '../../utils/rbac';
import type { AppProjectResource } from '../../types';

const ACTIONS = ['get', 'create', 'update', 'delete', 'sync', 'action', '*'];
const RESOURCES = [
  'applications',
  'repositories',
  'clusters',
  'projects',
  'logs',
  'exec',
  '*',
];

export const AccessTestTab: FC<{ obj?: Record<string, unknown> }> = ({
  obj,
}) => {
  const resource = obj as AppProjectResource | undefined;
  const { t } = useTranslation('plugin__gitops-enhanced');

  const [subject, setSubject] = useState('');
  const [action, setAction] = useState('get');
  const [selectedResource, setSelectedResource] = useState('applications');
  const [object, setObject] = useState('');
  const [result, setResult] = useState<{
    allowed: boolean;
    matchingPolicy?: string;
    matchingRole?: string;
  } | null>(null);

  if (!resource?.metadata) return <Bullseye><Spinner /></Bullseye>;

  const roles = resource.spec?.roles ?? [];

  const handleTest = () => {
    const res = evaluateAccess(
      roles,
      subject,
      action,
      selectedResource,
      object || undefined,
    );
    setResult(res);
  };

  return (
    <Card className="pf-v6-u-mt-md">
      <CardBody>
        <Form isHorizontal>
          <FormGroup label={t('Subject')} isRequired fieldId="subject">
            <TextInput
              id="subject"
              value={subject}
              onChange={(_e, v) => setSubject(v)}
              placeholder="proj:my-project:my-role"
            />
          </FormGroup>
          <FormGroup label={t('Action')} fieldId="action">
            <FormSelect
              id="action"
              value={action}
              onChange={(_e, v) => setAction(v)}
            >
              {ACTIONS.map((a) => (
                <FormSelectOption key={a} value={a} label={a} />
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label={t('Resource')} fieldId="resource">
            <FormSelect
              id="resource"
              value={selectedResource}
              onChange={(_e, v) => setSelectedResource(v)}
            >
              {RESOURCES.map((r) => (
                <FormSelectOption key={r} value={r} label={r} />
              ))}
            </FormSelect>
          </FormGroup>
          <FormGroup label={t('Object')} fieldId="object">
            <TextInput
              id="object"
              value={object}
              onChange={(_e, v) => setObject(v)}
              placeholder="my-project/my-app"
            />
          </FormGroup>
          <Button
            variant="primary"
            onClick={handleTest}
            isDisabled={!subject}
          >
            {t('Test Access')}
          </Button>
        </Form>

        {result && (
          <Alert
            variant={result.allowed ? 'success' : 'danger'}
            title={result.allowed ? t('ALLOWED') : t('DENIED')}
            isInline
            className="pf-v6-u-mt-md"
          >
            {result.matchingPolicy ? (
              <p>
                {t('Matching Rule')}: <code>{result.matchingPolicy}</code>
                {result.matchingRole && ` (${result.matchingRole})`}
              </p>
            ) : (
              <p>
                {t(
                  'No matching policy found — access denied by default',
                )}
              </p>
            )}
          </Alert>
        )}

        <ExpandableSection
          toggleText={t('How RBAC works')}
          className="pf-v6-u-mt-md"
        >
          <p>
            {t(
              'ArgoCD uses Casbin-format policies to control access. Each policy line has the form: p, subject, resource, action, object, effect. Deny rules take priority over allow rules. If no rule matches, access is denied by default.',
            )}
          </p>
        </ExpandableSection>
      </CardBody>
    </Card>
  );
};

export default AccessTestTab;
