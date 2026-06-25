let tokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null>): void {
  tokenGetter = getter;
}

export async function getAuthIdToken(): Promise<string | null> {
  if (!tokenGetter) return null;
  return tokenGetter();
}
