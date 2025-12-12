/**
 * User Repository - Pure data access for users.
 * Returns null/empty on not found (does not throw).
 */

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Find a user by ID.
 */
async function findById(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
  });
}

/**
 * Find a user by email.
 */
async function findByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

export const UserRepository = {
  findById,
  findByEmail,
};
