import type { ComponentType } from 'react';
import { features } from '../features';
import type { SlotName, SlotProps } from '../types/feature';

/** Renders every component registered by the enabled features for a given slot. */
export function Slot<K extends SlotName>({ name, props }: { name: K; props: SlotProps[K] }) {
  const components = features
    .map((f) => f.slots?.[name] as ComponentType<SlotProps[K]> | undefined)
    .filter((c): c is ComponentType<SlotProps[K]> => Boolean(c));
  return (
    <>
      {components.map((Component, i) => (
        <Component key={i} {...props} />
      ))}
    </>
  );
}

/** True when at least one enabled feature fills the slot. */
export function hasSlot(name: SlotName): boolean {
  return features.some((f) => Boolean(f.slots?.[name]));
}
