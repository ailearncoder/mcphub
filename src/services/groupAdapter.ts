import { shouldUseDatabase, getRepositoryFactory } from '../db/index.js';
import {
  getAllGroups as getAllGroupsFile,
  getGroupByIdOrName as getGroupByIdOrNameFile,
  createGroup as createGroupFile,
  updateGroup as updateGroupFile,
  deleteGroup as deleteGroupFile,
  addServerToGroup as addServerToGroupFile,
  removeServerFromGroup as removeServerFromGroupFile,
  getServersInGroup as getServersInGroupFile,
  updateGroupServers as updateGroupServersFile,
} from '../services/groupService.js';
import { IGroup } from '../types/index.js';

/**
 * Get all groups
 */
export const getAllGroups = async (): Promise<IGroup[]> => {
  // Check if database should be used for groups
  if (shouldUseDatabase('groups')) {
    try {
      const groupRepository = getRepositoryFactory('groups')();
      const dbGroups = await groupRepository.findAll();

      // Convert DB entities to IGroup interface
      return dbGroups.map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        servers: group.servers.map((server) => server.name),
      }));
    } catch (error) {
      console.error('Error getting groups from database:', error);
      // Fallback to file-based storage
      return getAllGroupsFile();
    }
  }

  // Use file-based storage
  return getAllGroupsFile();
};

/**
 * Get a group by ID or name
 * @param key Group ID or name
 */
export const getGroupByIdOrName = async (key: string): Promise<IGroup | undefined> => {
  // Check if database should be used for groups
  if (shouldUseDatabase('groups')) {
    try {
      const groupRepository = getRepositoryFactory('groups')();
      const group = await groupRepository.findByIdOrName(key);

      if (group) {
        return {
          id: group.id,
          name: group.name,
          description: group.description,
          servers: group.servers.map((server) => server.name),
        };
      }

      return undefined;
    } catch (error) {
      console.error('Error getting group by ID or name from database:', error);
      // Fallback to file-based storage
      return getGroupByIdOrNameFile(key);
    }
  }

  // Use file-based storage
  return getGroupByIdOrNameFile(key);
};

/**
 * Create a new group
 * @param name Group name
 * @param description Group description (optional)
 * @param servers Array of server names to add to group
 */
export const createGroup = async (
  name: string,
  description?: string,
  servers: string[] = [],
): Promise<IGroup | null> => {
  // Check if database should be used for groups
  if (shouldUseDatabase('groups')) {
    try {
      const groupRepository = getRepositoryFactory('groups')();
      const group = await groupRepository.createGroup(name, description, servers);

      return {
        id: group.id,
        name: group.name,
        description: group.description || undefined,
        servers: group.servers.map((server) => server.name),
      };
    } catch (error) {
      console.error('Error creating group in database:', error);
      // Fallback to file-based storage
      return createGroupFile(name, description, servers);
    }
  }

  // Use file-based storage
  return createGroupFile(name, description, servers);
};

/**
 * Update an existing group
 * @param id Group ID
 * @param data Group data to update
 */
export const updateGroup = async (id: string, data: Partial<IGroup>): Promise<IGroup | null> => {
  // Check if database should be used for groups
  if (shouldUseDatabase('groups')) {
    try {
      const groupRepository = getRepositoryFactory('groups')();

      // Find existing group
      let groupEntity = await groupRepository.repository.findOne({
        where: { id },
        relations: ['servers'],
      });

      if (!groupEntity) {
        return null;
      }

      // Update properties
      if (data.name !== undefined) {
        groupEntity.name = data.name;
      }

      if (data.description !== undefined) {
        groupEntity.description = data.description;
      }

      // Update servers if provided
      if (data.servers !== undefined) {
        const serverConfigRepo = getRepositoryFactory('serverConfigs')();
        const servers = [];

        for (const serverName of data.servers) {
          const server = await serverConfigRepo.findByName(serverName);
          if (server) {
            servers.push(server);
          }
        }

        groupEntity.servers = servers;
      }

      // Save changes
      groupEntity = await groupRepository.save(groupEntity);

      return {
        id: groupEntity.id,
        name: groupEntity.name,
        description: groupEntity.description,
        servers: groupEntity.servers.map((server) => server.name),
      };
    } catch (error) {
      console.error('Error updating group in database:', error);
      // Fallback to file-based storage
      return updateGroupFile(id, data);
    }
  }

  // Use file-based storage
  return updateGroupFile(id, data);
};

/**
 * Delete a group
 * @param id Group ID
 */
export const deleteGroup = async (id: string): Promise<boolean> => {
  // Check if database should be used for groups
  if (shouldUseDatabase('groups')) {
    try {
      const groupRepository = getRepositoryFactory('groups')();
      return await groupRepository.delete(id);
    } catch (error) {
      console.error('Error deleting group from database:', error);
      // Fallback to file-based storage
      return deleteGroupFile(id);
    }
  }

  // Use file-based storage
  return deleteGroupFile(id);
};

/**
 * Add a server to a group
 * @param groupId Group ID
 * @param serverName Server name
 */
export const addServerToGroup = async (
  groupId: string,
  serverName: string,
): Promise<IGroup | null> => {
  // Check if database should be used for groups
  if (shouldUseDatabase('groups')) {
    try {
      const groupRepository = getRepositoryFactory('groups')();
      const group = await groupRepository.addServerToGroup(groupId, serverName);

      if (!group) {
        return null;
      }

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        servers: group.servers.map((server) => server.name),
      };
    } catch (error) {
      console.error('Error adding server to group in database:', error);
      // Fallback to file-based storage
      return addServerToGroupFile(groupId, serverName);
    }
  }

  // Use file-based storage
  return addServerToGroupFile(groupId, serverName);
};

/**
 * Remove a server from a group
 * @param groupId Group ID
 * @param serverName Server name
 */
export const removeServerFromGroup = async (
  groupId: string,
  serverName: string,
): Promise<IGroup | null> => {
  // Check if database should be used for groups
  if (shouldUseDatabase('groups')) {
    try {
      const groupRepository = getRepositoryFactory('groups')();
      const group = await groupRepository.removeServerFromGroup(groupId, serverName);

      if (!group) {
        return null;
      }

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        servers: group.servers.map((server) => server.name),
      };
    } catch (error) {
      console.error('Error removing server from group in database:', error);
      // Fallback to file-based storage
      return removeServerFromGroupFile(groupId, serverName);
    }
  }

  // Use file-based storage
  return removeServerFromGroupFile(groupId, serverName);
};

/**
 * Get all servers in a group
 * @param groupId Group ID
 */
export const getServersInGroup = async (groupId: string): Promise<string[]> => {
  // Check if database should be used for groups
  if (shouldUseDatabase('groups')) {
    try {
      const groupRepository = getRepositoryFactory('groups')();
      const servers = await groupRepository.getGroupServers(groupId);

      return servers.map((server) => server.name);
    } catch (error) {
      console.error('Error getting servers in group from database:', error);
      // Fallback to file-based storage
      return getServersInGroupFile(groupId);
    }
  }

  // Use file-based storage
  return getServersInGroupFile(groupId);
};

/**
 * Update servers in a group
 * @param groupId Group ID
 * @param servers Array of server names
 */
export const updateGroupServers = async (
  groupId: string,
  servers: string[],
): Promise<IGroup | null> => {
  // Check if database should be used for groups
  if (shouldUseDatabase('groups')) {
    try {
      const groupRepository = getRepositoryFactory('groups')();
      const group = await groupRepository.updateGroupServers(groupId, servers);

      if (!group) {
        return null;
      }

      return {
        id: group.id,
        name: group.name,
        description: group.description,
        servers: group.servers.map((server) => server.name),
      };
    } catch (error) {
      console.error('Error updating group servers in database:', error);
      // Fallback to file-based storage
      return updateGroupServersFile(groupId, servers);
    }
  }

  // Use file-based storage
  return updateGroupServersFile(groupId, servers);
};
