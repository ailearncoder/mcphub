import { shouldUseDatabase, getRepositoryFactory } from '../db/index.js';
import {
  getMarketServers as getMarketServersFile,
  getMarketServerByName as getMarketServerByNameFile,
  getMarketCategories as getMarketCategoriesFile,
  getMarketTags as getMarketTagsFile,
  searchMarketServers as searchMarketServersFile,
  filterMarketServersByCategory as filterMarketServersByCategoryFile,
  filterMarketServersByTag as filterMarketServersByTagFile,
} from './marketService.js';
import { MarketServer } from '../types/index.js';
import { MarketServerRepository } from '../db/repositories/index.js';

/**
 * Get all market servers
 */
export const getMarketServers = async (): Promise<Record<string, MarketServer>> => {
  // Check if database should be used for market servers
  if (shouldUseDatabase('marketServers')) {
    try {
      const marketServerRepository = getRepositoryFactory(
        'marketServers',
      )() as MarketServerRepository;
      const dbMarketServers = await marketServerRepository.findAll();

      // Convert array to record object
      const marketServersRecord: Record<string, MarketServer> = {};
      dbMarketServers.forEach((server) => {
        marketServersRecord[server.name] = {
          name: server.name,
          display_name: server.display_name,
          description: server.description,
          repository: server.repository,
          homepage: server.homepage,
          author: server.author,
          license: server.license,
          categories: server.categories,
          tags: server.tags,
          examples: server.examples,
          installations: server.installations,
          arguments: server.arguments,
          tools: server.tools,
          is_official: server.is_official,
        };
      });

      return marketServersRecord;
    } catch (error) {
      console.error('Error getting market servers from database:', error);
      // Fallback to file-based storage
      return getMarketServersFile();
    }
  }

  // Use file-based storage
  return getMarketServersFile();
};

/**
 * Get a specific market server by name
 * @param name Market server name
 */
export const getMarketServerByName = async (name: string): Promise<MarketServer | null> => {
  // Check if database should be used for market servers
  if (shouldUseDatabase('marketServers')) {
    try {
      const marketServerRepository = getRepositoryFactory(
        'marketServers',
      )() as MarketServerRepository;
      const marketServer = await marketServerRepository.findByName(name);

      if (marketServer) {
        return {
          name: marketServer.name,
          display_name: marketServer.display_name,
          description: marketServer.description,
          repository: marketServer.repository,
          homepage: marketServer.homepage,
          author: marketServer.author,
          license: marketServer.license,
          categories: marketServer.categories,
          tags: marketServer.tags,
          examples: marketServer.examples,
          installations: marketServer.installations,
          arguments: marketServer.arguments,
          tools: marketServer.tools,
          is_official: marketServer.is_official,
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting market server by name from database:', error);
      // Fallback to file-based storage
      return getMarketServerByNameFile(name);
    }
  }

  // Use file-based storage
  return getMarketServerByNameFile(name);
};

/**
 * Get all categories from market servers
 */
export const getMarketCategories = async (): Promise<string[]> => {
  // Check if database should be used for market servers
  if (shouldUseDatabase('marketServers')) {
    try {
      const marketServerRepository = getRepositoryFactory(
        'marketServers',
      )() as MarketServerRepository;
      return await marketServerRepository.getCategories();
    } catch (error) {
      console.error('Error getting market categories from database:', error);
      // Fallback to file-based storage
      return getMarketCategoriesFile();
    }
  }

  // Use file-based storage
  return getMarketCategoriesFile();
};

/**
 * Get all tags from market servers
 */
export const getMarketTags = async (): Promise<string[]> => {
  // Check if database should be used for market servers
  if (shouldUseDatabase('marketServers')) {
    try {
      const marketServerRepository = getRepositoryFactory(
        'marketServers',
      )() as MarketServerRepository;
      return await marketServerRepository.getTags();
    } catch (error) {
      console.error('Error getting market tags from database:', error);
      // Fallback to file-based storage
      return getMarketTagsFile();
    }
  }

  // Use file-based storage
  return getMarketTagsFile();
};

/**
 * Search market servers by query
 * @param query Search query
 */
export const searchMarketServers = async (query: string): Promise<MarketServer[]> => {
  // Check if database should be used for market servers
  if (shouldUseDatabase('marketServers')) {
    try {
      const marketServerRepository = getRepositoryFactory(
        'marketServers',
      )() as MarketServerRepository;
      return await marketServerRepository.search(query);
    } catch (error) {
      console.error('Error searching market servers from database:', error);
      // Fallback to file-based storage
      return searchMarketServersFile(query);
    }
  }

  // Use file-based storage
  return searchMarketServersFile(query);
};

/**
 * Filter market servers by category
 * @param category Category to filter by
 */
export const filterMarketServersByCategory = async (category: string): Promise<MarketServer[]> => {
  // Check if database should be used for market servers
  if (shouldUseDatabase('marketServers')) {
    try {
      const marketServerRepository = getRepositoryFactory(
        'marketServers',
      )() as MarketServerRepository;
      return await marketServerRepository.filterByCategory(category);
    } catch (error) {
      console.error('Error filtering market servers by category from database:', error);
      // Fallback to file-based storage
      return filterMarketServersByCategoryFile(category);
    }
  }

  // Use file-based storage
  return filterMarketServersByCategoryFile(category);
};

/**
 * Filter market servers by tag
 * @param tag Tag to filter by
 */
export const filterMarketServersByTag = async (tag: string): Promise<MarketServer[]> => {
  // Check if database should be used for market servers
  if (shouldUseDatabase('marketServers')) {
    try {
      const marketServerRepository = getRepositoryFactory(
        'marketServers',
      )() as MarketServerRepository;
      return await marketServerRepository.filterByTag(tag);
    } catch (error) {
      console.error('Error filtering market servers by tag from database:', error);
      // Fallback to file-based storage
      return filterMarketServersByTagFile(tag);
    }
  }

  // Use file-based storage
  return filterMarketServersByTagFile(tag);
};
