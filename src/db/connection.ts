import 'reflect-metadata'; // Ensure reflect-metadata is imported here too
import { DataSource, DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import path from 'path';
import { fileURLToPath } from 'url';
import entities from './entities/index.js';

// Load environment variables with expansion
const env = dotenv.config();
dotenvExpand.expand(env);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default database configuration
const defaultConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'mcphub',
  synchronize: process.env.NODE_ENV !== 'production', // Auto-create schema in development
  logging: process.env.DB_LOGGING === 'true',
  entities: entities,
  ssl:
    process.env.DB_SSL === 'true'
      ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        }
      : false,
};

// AppDataSource is the TypeORM data source
export const AppDataSource = new DataSource(defaultConfig);

// Initialize database connection
export const initializeDatabase = async (): Promise<DataSource> => {
  try {
    if (!AppDataSource.isInitialized) {
      console.log('Initializing database connection...');
      await AppDataSource.initialize();

      // Create pgvector extension if it doesn't exist
      await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS vector;').catch((err) => {
        console.warn('Failed to create vector extension:', err.message);
        console.warn('Vector functionality may not be available.');
      });

      console.log('Database connection established successfully.');
    }
    return AppDataSource;
  } catch (error) {
    console.error('Error during database initialization:', error);
    throw error;
  }
};

// Get database connection status
export const isDatabaseConnected = (): boolean => {
  return AppDataSource.isInitialized;
};

// Close database connection
export const closeDatabase = async (): Promise<void> => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('Database connection closed.');
  }
};

export default AppDataSource;
