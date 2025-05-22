import { ServerConfig } from '../entities/ServerConfig.js';
import { Repository } from 'typeorm';
import { AppDataSource } from '../connection.js';

export class ServerConfigRepository {
  private readonly repository: Repository<ServerConfig>;

  constructor() {
    this.repository = AppDataSource.getRepository(ServerConfig);
  }

  /**
   * Find all server configurations
   */
  async findAll(): Promise<ServerConfig[]> {
    return this.repository.find();
  }

  /**
   * Find server configuration by name
   * @param name Server name
   */
  async findByName(name: string): Promise<ServerConfig | null> {
    return this.repository.findOneBy({ name });
  }

  /**
   * Get all enabled servers
   */
  async findEnabled(): Promise<ServerConfig[]> {
    return this.repository.findBy({ enabled: true });
  }

  /**
   * Save or update a server configuration
   * @param serverConfig Server configuration to save
   */
  async save(serverConfig: Partial<ServerConfig>): Promise<ServerConfig> {
    // Check if server exists
    const existingServer = await this.findByName(serverConfig.name as string);

    if (existingServer) {
      // Update properties
      Object.assign(existingServer, serverConfig);
      return this.repository.save(existingServer);
    }

    // Create new server config
    return this.repository.save(serverConfig as ServerConfig);
  }

  /**
   * Save multiple server configurations
   * @param serverConfigs Array of server configurations to save
   */
  async saveMany(serverConfigs: Partial<ServerConfig>[]): Promise<ServerConfig[]> {
    return this.repository.save(serverConfigs as ServerConfig[]);
  }

  /**
   * Delete a server configuration by name
   * @param name Server name
   */
  async delete(name: string): Promise<boolean> {
    const result = await this.repository.delete({ name });
    return result.affected !== undefined && result.affected > 0;
  }

  /**
   * Toggle server enabled status
   * @param name Server name
   * @param enabled New enabled status (if not provided, toggles current status)
   */
  async toggleEnabled(name: string, enabled?: boolean): Promise<ServerConfig | null> {
    const server = await this.findByName(name);

    if (!server) {
      return null;
    }

    // Toggle or set enabled status
    server.enabled = enabled !== undefined ? enabled : !server.enabled;
    return this.save(server);
  }
}

export default ServerConfigRepository;
