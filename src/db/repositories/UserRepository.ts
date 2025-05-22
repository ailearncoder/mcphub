import { User } from '../entities/User.js';
import BaseRepository from './BaseRepository.js';
import bcrypt from 'bcryptjs';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(User);
  }

  /**
   * Find a user by username
   * @param username Username to search for
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.repository.findOneBy({ username });
  }

  /**
   * Create a new user with encrypted password
   * @param userData User data including plain text password
   */
  async createUser(userData: {
    username: string;
    password: string;
    isAdmin?: boolean;
  }): Promise<User> {
    // Check if user exists
    const existingUser = await this.findByUsername(userData.username);
    if (existingUser) {
      throw new Error(`User with username ${userData.username} already exists`);
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    // Create and save the user
    const user = new User();
    user.username = userData.username;
    user.password = hashedPassword;
    user.isAdmin = userData.isAdmin || false;

    return this.save(user);
  }

  /**
   * Verify user password
   * @param user User entity
   * @param plainPassword Plain text password to verify
   */
  async verifyPassword(user: User, plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, user.password);
  }

  /**
   * Update user password
   * @param username Username
   * @param newPassword New plain text password
   */
  async updatePassword(username: string, newPassword: string): Promise<boolean> {
    const user = await this.findByUsername(username);
    if (!user) {
      return false;
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user
    user.password = hashedPassword;
    await this.save(user);
    return true;
  }
}

export default UserRepository;
