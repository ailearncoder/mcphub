import { shouldUseDatabase, getRepositoryFactory } from '../db/index.js';
import {
  getServersInfo as getServersInfoFile,
  addServer as addServerFile,
  removeServer as removeServerFile,
  updateMcpServer as updateMcpServerFile,
  toggleServerStatus as toggleServerStatusFile,
} from './mcpService.js';
import { ServerConfig } from '../types/index.js';
import { loadSettings } from '../config/index.js';
import { ServerConfigRepository } from '../db/repositories/index.js';

/**
 * Get all server configurations
 */
export const getServersInfo = async () => {
  // Check if database should be used for server configs
  if (shouldUseDatabase('serverConfigs')) {
    try {
      const serverConfigRepository = getRepositoryFactory(
        'serverConfigs',
      )() as ServerConfigRepository;
      const dbServerConfigs = await serverConfigRepository.findAll();

      // Convert DB entities to match the expected format from getServersInfo
      return dbServerConfigs.map((config) => ({
        name: config.name,
        status: 'disconnected', // Default status since DB only stores config
        error: null,
        tools: [],
        createTime: config.createdAt ? config.createdAt.getTime() : Date.now(),
        enabled: config.enabled,
      }));
    } catch (error) {
      console.error('Error getting server configurations from database:', error);
      // Fallback to file-based storage
      return getServersInfoFile();
    }
  }

  // Use file-based storage
  return getServersInfoFile();
};

/**
 * Get a server configuration by name
 * @param name Server name
 */
export const getServerConfigByName = async (name: string) => {
  // Check if database should be used for server configs
  if (shouldUseDatabase('serverConfigs')) {
    try {
      const serverConfigRepository = getRepositoryFactory(
        'serverConfigs',
      )() as ServerConfigRepository;
      const serverConfig = await serverConfigRepository.findByName(name);

      if (serverConfig) {
        return serverConfig;
      }

      return null;
    } catch (error) {
      console.error('Error getting server configuration from database:', error);
      // Fallback to file-based storage
      const settings = loadSettings();
      return settings.mcpServers[name] || null;
    }
  }

  // Use file-based storage
  const settings = loadSettings();
  return settings.mcpServers[name] || null;
};

/**
 * Add a new server configuration
 * @param name Server name
 * @param config Server configuration
 */
export const addServer = async (
  name: string,
  config: ServerConfig,
): Promise<{ success: boolean; message?: string }> => {
  // Check if database should be used for server configs
  if (shouldUseDatabase('serverConfigs')) {
    try {
      const serverConfigRepository = getRepositoryFactory(
        'serverConfigs',
      )() as ServerConfigRepository;

      // Check if server with this name already exists
      const existingServer = await serverConfigRepository.findByName(name);
      if (existingServer) {
        return { success: false, message: 'Server name already exists' };
      }

      // Add new server configuration
      await serverConfigRepository.save({
        name,
        type: config.type,
        url: config.url,
        command: config.command,
        args: config.args,
        env: config.env,
        enabled: config.enabled !== undefined ? config.enabled : true,
      });

      return { success: true, message: 'Server added successfully' };
    } catch (error) {
      console.error('Error adding server configuration to database:', error);
      // Fallback to file-based storage
      return addServerFile(name, config);
    }
  }

  // Use file-based storage
  return addServerFile(name, config);
};

/**
 * Update an existing server configuration
 * @param name Server name
 * @param config Updated server configuration
 */
export const updateMcpServer = async (
  name: string,
  config: ServerConfig,
): Promise<{ success: boolean; message?: string }> => {
  // Check if database should be used for server configs
  if (shouldUseDatabase('serverConfigs')) {
    try {
      const serverConfigRepository = getRepositoryFactory(
        'serverConfigs',
      )() as ServerConfigRepository;

      // Check if server with this name exists
      const existingServer = await serverConfigRepository.findByName(name);
      if (!existingServer) {
        return { success: false, message: 'Server not found' };
      }

      // Update server configuration
      await serverConfigRepository.save({
        name,
        type: config.type,
        url: config.url,
        command: config.command,
        args: config.args,
        env: config.env,
        enabled: config.enabled !== undefined ? config.enabled : true,
      });

      return { success: true, message: 'Server updated successfully' };
    } catch (error) {
      console.error('Error updating server configuration in database:', error);
      // Fallback to file-based storage
      return updateMcpServerFile(name, config);
    }
  }

  // Use file-based storage
  return updateMcpServerFile(name, config);
};

/**
 * Remove a server configuration
 * @param name Server name
 */
export const removeServer = async (
  name: string,
): Promise<{ success: boolean; message?: string }> => {
  // Check if database should be used for server configs
  if (shouldUseDatabase('serverConfigs')) {
    try {
      const serverConfigRepository = getRepositoryFactory(
        'serverConfigs',
      )() as ServerConfigRepository;

      // Check if server with this name exists
      const existingServer = await serverConfigRepository.findByName(name);
      if (!existingServer) {
        return { success: false, message: 'Server not found' };
      }

      // Remove server configuration
      const result = await serverConfigRepository.delete(name);

      if (result) {
        return { success: true, message: 'Server removed successfully' };
      } else {
        return { success: false, message: 'Failed to remove server' };
      }
    } catch (error) {
      console.error('Error removing server configuration from database:', error);
      // Fallback to file-based storage
      return removeServerFile(name);
    }
  }

  // Use file-based storage
  return removeServerFile(name);
};

/**
 * Toggle server enabled status
 * @param name Server name
 * @param enabled New enabled status
 */
export const toggleServerStatus = async (
  name: string,
  enabled: boolean,
): Promise<{ success: boolean; message?: string }> => {
  // Check if database should be used for server configs
  if (shouldUseDatabase('serverConfigs')) {
    try {
      const serverConfigRepository = getRepositoryFactory(
        'serverConfigs',
      )() as ServerConfigRepository;

      // Toggle server status
      const updatedServer = await serverConfigRepository.toggleEnabled(name, enabled);

      if (updatedServer) {
        return {
          success: true,
          message: `Server ${enabled ? 'enabled' : 'disabled'} successfully`,
        };
      } else {
        return { success: false, message: 'Server not found' };
      }
    } catch (error) {
      console.error('Error toggling server status in database:', error);
      // Fallback to file-based storage
      return toggleServerStatusFile(name, enabled);
    }
  }

  // Use file-based storage
  return toggleServerStatusFile(name, enabled);
};
