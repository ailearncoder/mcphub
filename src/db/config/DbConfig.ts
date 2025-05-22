import { McpSettings } from '../../types/index.js';
import { loadSettings, saveSettings } from '../../config/index.js';

/**
 * DbConfig class to manage database-related configuration options
 */
export class DbConfig {
  private static readonly DB_CONFIG_KEY = 'databaseConfig';

  /**
   * Gets the current database configuration
   */
  static getConfig(): DatabaseConfig {
    const settings = loadSettings();

    // Initialize database config if not present
    if (!settings.systemConfig) {
      settings.systemConfig = {};
    }

    if (!settings.systemConfig[DbConfig.DB_CONFIG_KEY]) {
      settings.systemConfig[DbConfig.DB_CONFIG_KEY] = {
        enabled: false,
        useForUsers: false,
        useForGroups: false,
        useForServerConfigs: false,
        useForMarketServers: false,
        useForVectorSearch: false,
        migrationCompleted: false,
      };
      saveSettings(settings);
    }

    return settings.systemConfig[DbConfig.DB_CONFIG_KEY] as DatabaseConfig;
  }

  /**
   * Updates the database configuration
   * @param config The new configuration to set
   */
  static updateConfig(config: Partial<DatabaseConfig>): boolean {
    const settings = loadSettings();

    // Initialize system config if not present
    if (!settings.systemConfig) {
      settings.systemConfig = {};
    }

    // Get current config or initialize with defaults
    const currentConfig = (settings.systemConfig[DbConfig.DB_CONFIG_KEY] as DatabaseConfig) || {
      enabled: false,
      useForUsers: false,
      useForGroups: false,
      useForServerConfigs: false,
      useForMarketServers: false,
      useForVectorSearch: false,
      migrationCompleted: false,
    };

    // Update with new values
    settings.systemConfig[DbConfig.DB_CONFIG_KEY] = {
      ...currentConfig,
      ...config,
    };

    return saveSettings(settings);
  }

  /**
   * Checks if database usage is enabled for a specific entity type
   * @param entityType The entity type to check
   */
  static isEnabledFor(entityType: DatabaseEntityType): boolean {
    const config = DbConfig.getConfig();

    // Database must be globally enabled first
    if (!config.enabled) {
      return false;
    }

    switch (entityType) {
      case 'users':
        return config.useForUsers;
      case 'groups':
        return config.useForGroups;
      case 'serverConfigs':
        return config.useForServerConfigs;
      case 'marketServers':
        return config.useForMarketServers;
      case 'vectorSearch':
        return config.useForVectorSearch;
      default:
        return false;
    }
  }
}

/**
 * Database entity types
 */
export type DatabaseEntityType =
  | 'users'
  | 'groups'
  | 'serverConfigs'
  | 'marketServers'
  | 'vectorSearch';

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  enabled: boolean;
  useForUsers: boolean;
  useForGroups: boolean;
  useForServerConfigs: boolean;
  useForMarketServers: boolean;
  useForVectorSearch: boolean;
  migrationCompleted: boolean;
}
