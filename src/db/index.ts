import { initializeDatabase, closeDatabase, isDatabaseConnected } from './connection.js';
import { DbConfig } from './config/DbConfig.js';
import { migrateToDatabase } from './migration/migrate.js';
import * as repositories from './repositories/index.js';

/**
 * Initialize the database module
 */
export async function initializeDbModule(): Promise<boolean> {
  const dbConfig = DbConfig.getConfig();

  if (!dbConfig.enabled) {
    console.log('Database usage is disabled in configuration.');
    return false;
  }

  try {
    // Connect to the database
    await initializeDatabase();

    // Check if this is the first run after enabling database
    if (dbConfig.enabled && !dbConfig.migrationCompleted) {
      console.log('First run detected. Attempting to migrate data to database...');
      const migrationResult = await migrateToDatabase();

      if (migrationResult.success) {
        console.log('Successfully migrated data to database:');
        console.log(`- Users: ${migrationResult.users}`);
        console.log(`- Groups: ${migrationResult.groups}`);
        console.log(`- Server Configs: ${migrationResult.serverConfigs}`);
        console.log(`- Market Servers: ${migrationResult.marketServers}`);
      } else {
        console.error('Failed to migrate data to database:', migrationResult.error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to initialize database module:', error);
    return false;
  }
}

/**
 * Get the repository factory for a database entity type
 * @param entityType The type of entity to get a repository for
 */
export function getRepositoryFactory(
  entityType: 'users' | 'groups' | 'serverConfigs' | 'marketServers' | 'vectorEmbeddings',
) {
  // Return the appropriate repository based on entity type
  switch (entityType) {
    case 'users':
      return () => new repositories.UserRepository();
    case 'groups':
      return () => new repositories.GroupRepository();
    case 'serverConfigs':
      return () => new repositories.ServerConfigRepository();
    case 'marketServers':
      return () => new repositories.MarketServerRepository();
    case 'vectorEmbeddings':
      return () => new repositories.VectorEmbeddingRepository();
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

/**
 * Check if the entity should use database
 * @param entityType The entity type to check
 */
export function shouldUseDatabase(
  entityType: 'users' | 'groups' | 'serverConfigs' | 'marketServers' | 'vectorEmbeddings',
): boolean {
  // 只检查全局 enabled 标志
  return DbConfig.isEnabledFor();
}

// Re-export everything from the database module
export {
  initializeDatabase,
  closeDatabase,
  isDatabaseConnected,
  DbConfig,
  migrateToDatabase,
  repositories,
};
