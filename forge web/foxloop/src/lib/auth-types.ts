export type AuthProviderType = "google" | "invited";

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  provider: AuthProviderType;
}
