/**
 * Both halves of a contract whose other side lives in another repository, in Spring's
 * CookieCsrfTokenRepository, which defaults to exactly these two names. Angular defaults to them
 * too; spelling one of them out by hand is what broke it, so they are spelled out once, here.
 */
export const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
export const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';
