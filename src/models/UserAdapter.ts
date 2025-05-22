import { shouldUseDatabase, getRepositoryFactory } from '../db/index.js';
import {
  findUserByUsername as findUserByUsernameFile,
  createUser as createUserFile,
  verifyPassword as verifyPasswordFile,
  updateUserPassword as updateUserPasswordFile,
  getUsers as getUsersFile,
  initializeDefaultUser as initializeDefaultUserFile,
} from './User.js';
import { IUser } from '../types/index.js';

/**
 * Get all users
 */
export const getUsers = async (): Promise<IUser[]> => {
  // Check if database should be used for users
  if (shouldUseDatabase('users')) {
    try {
      const userRepository = getRepositoryFactory('users')();
      const dbUsers = await userRepository.findAll();

      // Convert DB entities to IUser interface
      return dbUsers.map((user) => ({
        username: user.username,
        password: user.password,
        isAdmin: user.isAdmin,
      }));
    } catch (error) {
      console.error('Error getting users from database:', error);
      // Fallback to file-based storage
      return getUsersFile();
    }
  }

  // Use file-based storage
  return getUsersFile();
};

/**
 * Find user by username
 * @param username Username to search for
 */
export const findUserByUsername = async (username: string): Promise<IUser | undefined> => {
  // Check if database should be used for users
  if (shouldUseDatabase('users')) {
    try {
      const userRepository = getRepositoryFactory('users')();
      const user = await userRepository.findByUsername(username);

      if (user) {
        return {
          username: user.username,
          password: user.password,
          isAdmin: user.isAdmin,
        };
      }

      return undefined;
    } catch (error) {
      console.error('Error finding user by username in database:', error);
      // Fallback to file-based storage
      return findUserByUsernameFile(username);
    }
  }

  // Use file-based storage
  return findUserByUsernameFile(username);
};

/**
 * Create a new user
 * @param userData User data
 */
export const createUser = async (userData: IUser): Promise<IUser | null> => {
  // Check if database should be used for users
  if (shouldUseDatabase('users')) {
    try {
      const userRepository = getRepositoryFactory('users')();
      const user = await userRepository.createUser(userData);

      return {
        username: user.username,
        password: user.password,
        isAdmin: user.isAdmin,
      };
    } catch (error) {
      console.error('Error creating user in database:', error);
      // Fallback to file-based storage
      return await createUserFile(userData);
    }
  }

  // Use file-based storage
  return await createUserFile(userData);
};

/**
 * Verify user password
 * @param plainPassword Plain text password
 * @param hashedPassword Hashed password
 */
export const verifyPassword = async (
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  // Password verification is the same regardless of storage method
  return await verifyPasswordFile(plainPassword, hashedPassword);
};

/**
 * Update user password
 * @param username Username
 * @param newPassword New password
 */
export const updateUserPassword = async (
  username: string,
  newPassword: string,
): Promise<boolean> => {
  // Check if database should be used for users
  if (shouldUseDatabase('users')) {
    try {
      const userRepository = getRepositoryFactory('users')();
      return await userRepository.updatePassword(username, newPassword);
    } catch (error) {
      console.error('Error updating user password in database:', error);
      // Fallback to file-based storage
      return await updateUserPasswordFile(username, newPassword);
    }
  }

  // Use file-based storage
  return await updateUserPasswordFile(username, newPassword);
};

/**
 * Initialize default admin user if no users exist
 */
export const initializeDefaultUser = async (): Promise<void> => {
  // Check if database should be used for users
  if (shouldUseDatabase('users')) {
    try {
      const userRepository = getRepositoryFactory('users')();
      const users = await userRepository.findAll();

      if (users.length === 0) {
        await userRepository.createUser({
          username: 'admin',
          password: 'admin123',
          isAdmin: true,
        });
        console.log('Default admin user created in database');
      }

      return;
    } catch (error) {
      console.error('Error initializing default user in database:', error);
      // Fallback to file-based method
      return await initializeDefaultUserFile();
    }
  }

  // Use file-based method
  return await initializeDefaultUserFile();
};
