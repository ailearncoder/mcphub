import { Group } from '../entities/Group.js';
import { ServerConfig } from '../entities/ServerConfig.js';
import BaseRepository from './BaseRepository.js';
import { AppDataSource } from '../connection.js';
import { v4 as uuidv4 } from 'uuid';

export class GroupRepository extends BaseRepository<Group> {
  constructor() {
    super(Group);
  }

  /**
   * Find a group by name
   * @param name Group name
   */
  async findByName(name: string): Promise<Group | null> {
    return this.repository.findOneBy({ name });
  }

  /**
   * Find a group by ID or name
   * @param key Group ID or name
   */
  async findByIdOrName(key: string): Promise<Group | null> {
    return this.repository.findOne({
      where: [{ id: key }, { name: key }],
      relations: ['servers'],
    });
  }

  /**
   * Create a new group
   * @param name Group name
   * @param description Group description (optional)
   * @param serverNames Array of server names to add to group
   */
  async createGroup(
    name: string,
    description?: string,
    serverNames: string[] = [],
  ): Promise<Group> {
    // Check if group with same name exists
    const existingGroup = await this.findByName(name);
    if (existingGroup) {
      throw new Error(`Group with name ${name} already exists`);
    }

    // Find server configs by name
    const serverConfigRepo = AppDataSource.getRepository(ServerConfig);
    const servers = await serverConfigRepo.findBy({
      name: { $in: serverNames } as any,
    });

    // Create and save group
    const group = new Group();
    group.id = uuidv4();
    group.name = name;
    group.description = description || '';
    group.servers = servers;

    return this.save(group);
  }

  /**
   * Get all servers in a group
   * @param groupId Group ID
   */
  async getGroupServers(groupId: string): Promise<ServerConfig[]> {
    const group = await this.repository.findOne({
      where: { id: groupId },
      relations: ['servers'],
    });

    return group?.servers || [];
  }

  /**
   * Update servers in a group
   * @param groupId Group ID
   * @param serverNames Array of server names to set for the group
   */
  async updateGroupServers(groupId: string, serverNames: string[]): Promise<Group | null> {
    const group = await this.repository.findOne({
      where: { id: groupId },
      relations: ['servers'],
    });

    if (!group) {
      return null;
    }

    // Find server configs by name
    const serverConfigRepo = AppDataSource.getRepository(ServerConfig);
    const servers = await serverConfigRepo.findBy({
      name: { $in: serverNames } as any,
    });

    group.servers = servers;
    return this.save(group);
  }

  /**
   * Add a server to a group
   * @param groupId Group ID
   * @param serverName Server name to add
   */
  async addServerToGroup(groupId: string, serverName: string): Promise<Group | null> {
    const group = await this.repository.findOne({
      where: { id: groupId },
      relations: ['servers'],
    });

    if (!group) {
      return null;
    }

    // Check if server exists
    const serverConfigRepo = AppDataSource.getRepository(ServerConfig);
    const serverConfig = await serverConfigRepo.findOneBy({ name: serverName });

    if (!serverConfig) {
      return null;
    }

    // Check if server already in group
    if (!group.servers.some((server) => server.name === serverName)) {
      group.servers.push(serverConfig);
      return this.save(group);
    }

    return group;
  }

  /**
   * Remove a server from a group
   * @param groupId Group ID
   * @param serverName Server name to remove
   */
  async removeServerFromGroup(groupId: string, serverName: string): Promise<Group | null> {
    const group = await this.repository.findOne({
      where: { id: groupId },
      relations: ['servers'],
    });

    if (!group) {
      return null;
    }

    group.servers = group.servers.filter((server) => server.name !== serverName);
    return this.save(group);
  }
}

export default GroupRepository;
