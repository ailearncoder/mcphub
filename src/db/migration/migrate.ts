import { initializeDatabase, closeDatabase, AppDataSource } from '../connection.js';
import {
  UserRepository,
  GroupRepository,
  ServerConfigRepository,
  MarketServerRepository,
} from '../repositories/index.js';
import { User, Group, ServerConfig, MarketServer } from '../entities/index.js';
import { DbConfig } from '../config/DbConfig.js';
import { loadSettings } from '../../config/index.js';
import { getMarketServers } from '../../services/marketService.js';
import { IUser, IGroup } from '../../types/index.js';

/**
 * Migrate all data from file-based storage to the database
 */
export async function migrateToDatabase(): Promise<{
  success: boolean;
  users?: number;
  groups?: number;
  serverConfigs?: number;
  marketServers?: number;
  error?: string;
}> {
  try {
    // Check if migration already completed
    const dbConfig = DbConfig.getConfig();
    if (dbConfig.migrationCompleted) {
      return {
        success: false,
        error:
          'Migration has already been completed. Set migrationCompleted to false in your configuration to force a re-migration.',
      };
    }

    // Initialize database connection
    await initializeDatabase();

    // Load settings
    const settings = loadSettings();

    // Clear join tables first to handle foreign key constraints
    await AppDataSource.query('TRUNCATE TABLE "group_server_mappings" CASCADE');

    // Migrate users
    const userCount = await migrateUsers(settings.users || []);

    // Migrate server configs
    const serverConfigCount = await migrateServerConfigs(settings.mcpServers);

    // Migrate groups (after servers)
    const groupCount = await migrateGroups(settings.groups || []);

    // Migrate market servers
    const marketServers = getMarketServers();
    const marketServerCount = await migrateMarketServers(marketServers);

    // Mark migration as completed
    DbConfig.updateConfig({ migrationCompleted: true });

    return {
      success: true,
      users: userCount,
      groups: groupCount,
      serverConfigs: serverConfigCount,
      marketServers: marketServerCount,
    };
  } catch (error) {
    console.error('Error during migration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Migrate users
 * @param users Users to migrate
 */
async function migrateUsers(users: IUser[]): Promise<number> {
  if (users.length === 0) {
    return 0;
  }

  const userRepository = new UserRepository();

  // Clear existing users if any
  await AppDataSource.getRepository(User).clear();

  // Insert all users
  for (const userData of users) {
    const user = new User();
    user.username = userData.username;
    user.password = userData.password; // Already hashed
    user.isAdmin = userData.isAdmin || false;
    await userRepository.save(user);
  }

  return users.length;
}

/**
 * Migrate server configs
 * @param serverConfigs Server configs to migrate
 */
async function migrateServerConfigs(serverConfigs: Record<string, any>): Promise<number> {
  if (Object.keys(serverConfigs).length === 0) {
    return 0;
  }

  const serverConfigRepository = new ServerConfigRepository();

  // Clear existing server configs with CASCADE to handle foreign key constraints
  await AppDataSource.query('TRUNCATE TABLE "server_configs" CASCADE');

  // Insert all server configs
  for (const [name, config] of Object.entries(serverConfigs)) {
    const serverConfig = new ServerConfig();
    serverConfig.name = name;
    serverConfig.type = config.type;
    serverConfig.url = config.url;
    serverConfig.command = config.command;
    serverConfig.args = config.args || [];
    serverConfig.env = config.env || {};
    serverConfig.enabled = config.enabled !== false; // Default to true
    serverConfig.metadata = {}; // Any extra data

    await serverConfigRepository.save(serverConfig);
  }

  return Object.keys(serverConfigs).length;
}

/**
 * Migrate groups
 * @param groups Groups to migrate
 */
async function migrateGroups(groups: IGroup[]): Promise<number> {
  if (groups.length === 0) {
    return 0;
  }

  const groupRepository = new GroupRepository();
  const serverConfigRepository = new ServerConfigRepository();

  // Clear existing groups if any
  await AppDataSource.getRepository(Group).clear();

  // Insert all groups
  for (const groupData of groups) {
    const group = new Group();
    group.id = groupData.id;
    group.name = groupData.name;
    group.description = groupData.description || '';

    // Find server configs for this group
    const servers = [];
    for (const serverName of groupData.servers) {
      const server = await serverConfigRepository.findByName(serverName);
      if (server) {
        servers.push(server);
      }
    }

    group.servers = servers;
    await groupRepository.save(group);
  }

  return groups.length;
}

/**
 * Migrate market servers
 * @param marketServers Market servers to migrate
 */
async function migrateMarketServers(marketServers: Record<string, any>): Promise<number> {
  if (Object.keys(marketServers).length === 0) {
    return 0;
  }

  const marketServerRepository = new MarketServerRepository();

  // Clear existing market servers if any
  await AppDataSource.getRepository(MarketServer).clear();

  // Insert all market servers
  for (const [name, serverData] of Object.entries(marketServers)) {
    const marketServer = new MarketServer();
    marketServer.name = name;
    marketServer.display_name = serverData.display_name;
    marketServer.description = serverData.description;
    marketServer.repository = serverData.repository;
    marketServer.homepage = serverData.homepage;
    marketServer.author = serverData.author;
    marketServer.license = serverData.license;
    marketServer.categories = serverData.categories || [];
    marketServer.tags = serverData.tags || [];
    marketServer.examples = serverData.examples || [];
    marketServer.installations = serverData.installations || {};
    marketServer.arguments = serverData.arguments || {};
    marketServer.tools = serverData.tools || [];
    marketServer.is_official = serverData.is_official || false;

    await marketServerRepository.save(marketServer);
  }

  return Object.keys(marketServers).length;
}
