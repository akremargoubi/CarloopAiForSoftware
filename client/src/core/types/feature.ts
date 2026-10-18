import type { ComponentType, ReactNode } from 'react';
import type { Role } from './index';

/** Props received by the components plugged into each slot. */
export interface SlotProps {
  /** Home page, right under the hero title (e.g. the AI search bar). */
  'home.hero': Record<string, never>;
  /** Home page, extra sections below the categories. */
  'home.sections': Record<string, never>;
  /** Provider page, extra sections (e.g. reviews summary). */
  'provider.sections': { providerId: string };
  /** Provider page, call-to-action buttons (e.g. "Réserver"). */
  'provider.actions': { providerId: string };
}

export type SlotName = keyof SlotProps;

export interface FeatureRoute {
  path: string;
  element: ReactNode;
  /** Restricts the route to these roles (any logged-in user when empty array). */
  roles?: Role[];
}

export interface FeatureNavLink {
  to: string;
  label: string;
  /** Visible only for these roles; visible to everyone when omitted. */
  roles?: Role[];
}

/**
 * Contract implemented by every feature folder (client/src/features/<name>/module.tsx).
 * Modules never import each other: they communicate through URLs and slots.
 */
export interface ClientFeature {
  name: string;
  routes?: FeatureRoute[];
  navLinks?: FeatureNavLink[];
  /** Components rendered on every page (e.g. floating chat widget). */
  globalWidgets?: ComponentType[];
  slots?: { [K in SlotName]?: ComponentType<SlotProps[K]> };
}
