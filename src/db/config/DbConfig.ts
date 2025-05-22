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
   * Checks if database is enabled globally
   * @param entityType Optional parameter kept for backward compatibility
   */
  static isEnabledFor(entityType?: DatabaseEntityType): boolean {
    return DbConfig.getConfig().enabled;
  }
}

/**
 * Database entity types (kept for backward compatibility)
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
  migrationCompleted: boolean;
}
