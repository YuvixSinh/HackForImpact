/**
 * Demo-auth credential store (ADR 0004): in-process, lost on restart, for local development
 * while no hosted Supabase project is configured. Supabase Auth replaces it later.
 */
export type DemoUser = { id: string; email: string; passwordHash: string };

export interface DemoUserStore {
  /** Returns null when the email is already registered (case-insensitive). */
  create(email: string, passwordHash: string): DemoUser | null;
  findByEmail(email: string): DemoUser | null;
  getById(id: string): DemoUser | null;
}

const normalise = (email: string) => email.trim().toLowerCase();

export function createDemoUserStore(): DemoUserStore {
  const byEmail = new Map<string, DemoUser>();
  const byId = new Map<string, DemoUser>();

  return {
    create(email, passwordHash) {
      const key = normalise(email);
      if (byEmail.has(key)) return null;
      const user: DemoUser = { id: crypto.randomUUID(), email: key, passwordHash };
      byEmail.set(key, user);
      byId.set(user.id, user);
      return { ...user };
    },
    findByEmail(email) {
      const user = byEmail.get(normalise(email));
      return user ? { ...user } : null;
    },
    getById(id) {
      const user = byId.get(id);
      return user ? { ...user } : null;
    },
  };
}
