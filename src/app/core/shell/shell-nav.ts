import { ACCOUNTS_PATHS } from '@features/accounts/contract/accounts-paths';
import { HOLDINGS_PATHS } from '@features/holdings/contract/holdings-paths';
import { PORTFOLIO_PATHS } from '@features/portfolio/contract/portfolio-paths';

export const SHELL_ICONS = ['portfolio', 'holdings', 'allocation', 'accounts'] as const;
export type ShellIcon = (typeof SHELL_ICONS)[number];

export type ShellDestination = {
  path: string;
  labelKey: string;
  icon: ShellIcon;
};

export const SHELL_DESTINATIONS: ShellDestination[] = [
  { path: PORTFOLIO_PATHS.home, labelKey: 'shell.portfolio', icon: 'portfolio' },
  { path: HOLDINGS_PATHS.list, labelKey: 'shell.holdings', icon: 'holdings' },
  { path: PORTFOLIO_PATHS.allocation, labelKey: 'shell.allocation', icon: 'allocation' },
  { path: ACCOUNTS_PATHS.list, labelKey: 'shell.accounts', icon: 'accounts' },
];
