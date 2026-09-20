import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { User } from '../generated/client';
import { UserNotFoundError } from './errors/user-not-found.error';

/**
 * Service for user-related operations.
 * Provides lookups used by authentication strategies.
 * @param prisma PrismaService for database access
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a user by their username.
   * @param username The unique username to search for
   * @returns The matching User record
   * @throws UserNotFoundError if no user exists with the given username
   */
  async findByUsername(username: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { username } });

    if (!user) {
      throw new UserNotFoundError(username);
    }

    return user;
  }

  /**
   * Find a user by their ID.
   * @param id The unique user identifier
   * @returns The matching User record
   * @throws UserNotFoundError if no user exists with the given ID
   */
  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new UserNotFoundError(id);
    }

    return user;
  }
}
