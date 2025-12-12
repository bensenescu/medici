/**
 * Utility functions for formatting display values.
 */

/**
 * Tolerance for floating point currency comparisons.
 * Used to handle rounding errors in financial calculations.
 */
export const CURRENCY_TOLERANCE = 0.01;

/**
 * Get a display name for a user, falling back gracefully.
 * Priority: firstName + lastName > firstName > email username
 */
export function getUserDisplayName(user?: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}): string {
  if (!user) return "Unknown";
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(" ");
  }
  return user.email.split("@")[0];
}

/**
 * Get initials for a user, falling back to email initial.
 * Priority: firstName initial > email initial
 */
export function getUserInitials(user?: {
  firstName?: string | null;
  email: string;
}): string {
  if (!user) return "?";
  if (user.firstName && user.firstName.length > 0) {
    return user.firstName[0].toUpperCase();
  }
  return user.email[0].toUpperCase();
}
