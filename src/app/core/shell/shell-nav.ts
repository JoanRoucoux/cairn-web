export const SHELL_ICONS = ['portfolio', 'holdings', 'allocation', 'sources'] as const;
export type ShellIcon = (typeof SHELL_ICONS)[number];

export type ShellDestination = {
  path: string;
  labelKey: string;
  icon: ShellIcon;
};

/** The four destinations, in the order they appear in both the sidebar and the tab bar. */
export const SHELL_DESTINATIONS: ShellDestination[] = [
  { path: '/', labelKey: 'shell.portfolio', icon: 'portfolio' },
  { path: '/holdings', labelKey: 'shell.holdings', icon: 'holdings' },
  { path: '/allocation', labelKey: 'shell.allocation', icon: 'allocation' },
  { path: '/sources', labelKey: 'shell.sources', icon: 'sources' },
];
