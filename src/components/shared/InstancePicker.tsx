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
} from '@patternfly/react-core';
import { ServerIcon } from '@patternfly/react-icons';
import { useCurrentInstance } from '../../hooks/useArgoCDInstances';

export const InstancePicker: FC = () => {
  const { t } = useTranslation('plugin__gitops-enhanced');
  const { instance, instances, setInstance } = useCurrentInstance();
  const [isOpen, setIsOpen] = useState(false);

  if (instances.length <= 1) {
    return (
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsXs' }}>
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
        const selected = instances.find((i) => `${i.namespace}/${i.name}` === val);
        if (selected) setInstance(selected);
        setIsOpen(false);
      }}
      toggle={(ref) => (
        <MenuToggle ref={ref} onClick={() => setIsOpen(!isOpen)}>
          <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsXs' }}>
            <FlexItem><ServerIcon /></FlexItem>
            <FlexItem>{instance.namespace}/{instance.name}</FlexItem>
          </Flex>
        </MenuToggle>
      )}
      selected={`${instance.namespace}/${instance.name}`}
    >
      <SelectList>
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
