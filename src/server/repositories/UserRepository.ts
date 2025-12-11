/**
 * User Repository - Pure data access for users.
 * Returns null/empty on not found (does not throw).
 */

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export class UserRepository {
  /**
   * Find a user by ID.
   */
  static async findById(userId: string) {
    return db.query.users.findFirst({
      where: eq(users.id, userId),
    });
  }

  /**
   * Find a user by email.
   */
  static async findByEmail(email: string) {
    return db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }
}
