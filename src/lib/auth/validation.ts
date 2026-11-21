export type FieldErrors = Partial<Record<"email" | "password" | "accountName", string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

export function validateSignUp(input: { email: string; password: string; accountName: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (!EMAIL.test(input.email.trim())) errors.email = "Enter a valid email address.";
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  const name = input.accountName.trim();
  if (name.length < 2 || name.length > 100) errors.accountName = "Enter a name between 2 and 100 characters.";
  return errors;
}
