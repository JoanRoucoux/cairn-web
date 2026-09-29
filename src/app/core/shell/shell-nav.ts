export const SHELL_ICONS = ['portfolio', 'holdings', 'allocation', 'accounts'] as const;
export type ShellIcon = (typeof SHELL_ICONS)[number];

export type ShellDestination = {
  path: string;
  labelKey: string;
  icon: ShellIcon;
};

export const SHELL_DESTINATIONS: ShellDestination[] = [
  { path: '/', labelKey: 'shell.portfolio', icon: 'portfolio' },
  { path: '/holdings', labelKey: 'shell.holdings', icon: 'holdings' },
  { path: '/allocation', labelKey: 'shell.allocation', icon: 'allocation' },
  { path: '/accounts', labelKey: 'shell.accounts', icon: 'accounts' },
];
