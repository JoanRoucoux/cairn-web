import type { Route } from '@playwright/test';

const INITIAL = { language: 'en', theme: 'system' };

const preferences = { ...INITIAL };

export const resetPreferences = (): void => {
  Object.assign(preferences, INITIAL);
};

export const getPreferences = (route: Route): Promise<void> => route.fulfill({ json: preferences });

export const updatePreferences = (route: Route): Promise<void> => {
  Object.assign(preferences, route.request().postDataJSON());

  return route.fulfill({ json: preferences });
};
