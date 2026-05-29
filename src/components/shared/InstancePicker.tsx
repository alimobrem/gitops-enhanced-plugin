import React from 'react';
import { useState, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectOption,
  SelectList,
  MenuToggle,
  Flex,
  FlexItem,
  Label,
  Divider,
} from '@patternfly/react-core';
import { ServerIcon } from '@patternfly/react-icons';
import { useCurrentInstance, ALL_INSTANCES, isAllInstances } from '../../hooks/useArgoCDInstances';
import { FLEX_SPACE_XS, FLEX_ALIGN_CENTER } from '../../utils/pf-constants';

export const InstancePicker: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { instance, instances, setInstance } = useCurrentInstance();
  const [isOpen, setIsOpen] = useState(false);

  const displayName = isAllInstances(instance) ? t('All Instances') : `${instance.namespace}/${instance.name}`;

  if (instances.length <= 1) {
    return (
      <Flex alignItems={FLEX_ALIGN_CENTER} spaceItems={FLEX_SPACE_XS}>
        <FlexItem><ServerIcon /></FlexItem>
        <FlexItem>
          <Label isCompact>{instance.namespace}</Label>
        </FlexItem>
      </Flex>
    );
  }

  return (
    <Select
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onSelect={(_e, val) => {
        if (val === '*/*') {
          setInstance(ALL_INSTANCES);
        } else {
          const selected = instances.find((i) => `${i.namespace}/${i.name}` === val);
          if (selected) setInstance(selected);
        }
        setIsOpen(false);
      }}
      toggle={(ref) => (
        <MenuToggle ref={ref} onClick={() => setIsOpen(!isOpen)}>
          <Flex alignItems={FLEX_ALIGN_CENTER} spaceItems={FLEX_SPACE_XS}>
            <FlexItem><ServerIcon /></FlexItem>
            <FlexItem>{displayName}</FlexItem>
          </Flex>
        </MenuToggle>
      )}
      selected={isAllInstances(instance) ? '*/*' : `${instance.namespace}/${instance.name}`}
    >
      <SelectList>
        <SelectOption value="*/*">{t('All Instances')}</SelectOption>
        <Divider />
        {instances.map((inst) => (
          <SelectOption key={`${inst.namespace}/${inst.name}`} value={`${inst.namespace}/${inst.name}`}>
            {inst.namespace}/{inst.name}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};

export default InstancePicker;
