import type { Repositories } from "@/lib/db/repositories";
import type { Account } from "@/lib/domain/account";
import type { DemoUserStore } from "./demo-users";
import { hashPassword, verifyPassword } from "./password";
import { accountShapeForRole, type SignupRole } from "./roles";
import { createSessionToken, readSessionToken } from "./session-token";
import { validateSignUp, type FieldErrors } from "./validation";

/** The signed-in user and the account every request acts for. Resolved on the server only. */
export type Viewer = { userId: string; account: Account };

export type SignUpInput = { role: SignupRole; accountName: string; email: string; password: string };
export type SignInInput = { email: string; password: string };

export type AuthFailure =
  | { ok: false; error: "invalid_input"; fieldErrors: FieldErrors }
  | { ok: false; error: "email_taken" | "invalid_credentials" };
export type AuthSuccess = { ok: true; viewer: Viewer; token: string };

export interface AuthService {
  signUp(input: SignUpInput): Promise<AuthSuccess | AuthFailure>;
  signIn(input: SignInInput): Promise<AuthSuccess | AuthFailure>;
  /** Verifies the session token and the user's current membership of the claimed account. */
  viewerFromToken(token: string | undefined): Promise<Viewer | null>;
}

type Deps = { repos: Repositories; users: DemoUserStore; secret: string; clock?: () => Date };

export function createAuthService({ repos, users, secret, clock = () => new Date() }: Deps): AuthService {
  const issue = (viewer: Viewer): AuthSuccess => ({
    ok: true,
    viewer,
    token: createSessionToken({ userId: viewer.userId, accountId: viewer.account.id }, secret, clock()),
  });

  return {
    async signUp(input) {
      const fieldErrors = validateSignUp(input);
      if (Object.keys(fieldErrors).length > 0) return { ok: false, error: "invalid_input", fieldErrors };
      const user = users.create(input.email, await hashPassword(input.password));
      if (!user) return { ok: false, error: "email_taken" };
      const account = await repos.accounts.create({
        ...accountShapeForRole(input.role),
        name: input.accountName,
        ownerUserId: user.id,
      });
      return issue({ userId: user.id, account });
    },

    async signIn(input) {
      const user = users.findByEmail(input.email);
      // Same answer for an unknown email and a wrong password.
      if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
        return { ok: false, error: "invalid_credentials" };
      }
      const [account] = await repos.accounts.listForUser(user.id);
      if (!account) return { ok: false, error: "invalid_credentials" };
      return issue({ userId: user.id, account });
    },

    async viewerFromToken(token) {
      const claims = readSessionToken(token, secret, clock());
      if (!claims || !users.getById(claims.userId)) return null;
      const account = (await repos.accounts.listForUser(claims.userId)).find((a) => a.id === claims.accountId);
      return account ? { userId: claims.userId, account } : null;
    },
  };
}
