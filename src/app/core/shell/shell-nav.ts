import { ACCOUNTS_PATH } from '@features/accounts/contract/accounts-paths';
import { HOLDINGS_PATH } from '@features/holdings/contract/holdings-paths';
import { ALLOCATION_PATH, PORTFOLIO_PATH } from '@features/portfolio/contract/portfolio-paths';

export const SHELL_ICONS = ['portfolio', 'holdings', 'allocation', 'accounts'] as const;
export type ShellIcon = (typeof SHELL_ICONS)[number];

export type ShellDestination = {
  path: string;
  labelKey: string;
  icon: ShellIcon;
};

export const SHELL_DESTINATIONS: ShellDestination[] = [
  { path: PORTFOLIO_PATH, labelKey: 'shell.portfolio', icon: 'portfolio' },
  { path: HOLDINGS_PATH, labelKey: 'shell.holdings', icon: 'holdings' },
  { path: ALLOCATION_PATH, labelKey: 'shell.allocation', icon: 'allocation' },
  { path: ACCOUNTS_PATH, labelKey: 'shell.accounts', icon: 'accounts' },
];
