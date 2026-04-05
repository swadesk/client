/** Avoids circular imports between `lib/api` and `store/auth-store`. */
let getToken: () => string | null = () => null;
let setToken: (token: string) => void = () => {};

export function setApiAccessTokenGetter(fn: () => string | null): void {
  getToken = fn;
}

export function setApiAccessTokenSetter(fn: (token: string) => void): void {
  setToken = fn;
}

export function getApiAccessToken(): string | null {
  return getToken();
}

/** Used by `apiFetch` after a successful refresh so retries send the new JWT. */
export function setApiAccessToken(token: string): void {
  setToken(token);
}
