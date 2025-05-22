import { MarketServer } from '../entities/MarketServer.js';
import { Repository } from 'typeorm';
import { AppDataSource } from '../connection.js';

export class MarketServerRepository {
  private readonly repository: Repository<MarketServer>;

  constructor() {
    this.repository = AppDataSource.getRepository(MarketServer);
  }

  /**
   * Find all market servers
   */
  async findAll(): Promise<MarketServer[]> {
    return this.repository.find({
      order: {
        is_official: 'DESC',
        display_name: 'ASC',
      },
    });
  }

  /**
   * Find market server by name
   * @param name Market server name
   */
  async findByName(name: string): Promise<MarketServer | null> {
    return this.repository.findOneBy({ name });
  }

  /**
   * Get all categories from market servers
   */
  async getCategories(): Promise<string[]> {
    const servers = await this.findAll();
    const categories = new Set<string>();

    servers.forEach((server) => {
      server.categories?.forEach((category) => {
        categories.add(category);
      });
    });

    return Array.from(categories).sort();
  }

  /**
   * Get all tags from market servers
   */
  async getTags(): Promise<string[]> {
    const servers = await this.findAll();
    const tags = new Set<string>();

    servers.forEach((server) => {
      server.tags?.forEach((tag) => {
        tags.add(tag);
      });
    });

    return Array.from(tags).sort();
  }

  /**
   * Search market servers by query term
   * @param query Search query term
   */
  async search(query: string): Promise<MarketServer[]> {
    if (!query) {
      return this.findAll();
    }

    const searchTerms = query
      .toLowerCase()
      .split(' ')
      .filter((term) => term.length > 0);

    if (searchTerms.length === 0) {
      return this.findAll();
    }

    const servers = await this.findAll();

    return servers.filter((server) => {
      // Search in name, display_name, description, categories, and tags
      const searchableText = [
        server.name,
        server.display_name,
        server.description,
        ...(server.categories || []),
        ...(server.tags || []),
      ]
        .join(' ')
        .toLowerCase();

      return searchTerms.some((term) => searchableText.includes(term));
    });
  }

  /**
   * Filter market servers by category
   * @param category Category to filter by
   */
  async filterByCategory(category: string): Promise<MarketServer[]> {
    if (!category) {
      return this.findAll();
    }

    return this.repository
      .createQueryBuilder('market_server')
      .where(':category = ANY(market_server.categories)', { category })
      .orderBy({
        'market_server.is_official': 'DESC',
        'market_server.display_name': 'ASC',
      })
      .getMany();
  }

  /**
   * Filter market servers by tag
   * @param tag Tag to filter by
   */
  async filterByTag(tag: string): Promise<MarketServer[]> {
    if (!tag) {
      return this.findAll();
    }

    return this.repository
      .createQueryBuilder('market_server')
      .where(':tag = ANY(market_server.tags)', { tag })
      .orderBy({
        'market_server.is_official': 'DESC',
        'market_server.display_name': 'ASC',
      })
      .getMany();
  }

  /**
   * Save or update a market server
   * @param marketServer Market server to save
   */
  async save(marketServer: Partial<MarketServer>): Promise<MarketServer> {
    return this.repository.save(marketServer as MarketServer);
  }

  /**
   * Save multiple market servers
   * @param marketServers Array of market servers to save
   */
  async saveMany(marketServers: Partial<MarketServer>[]): Promise<MarketServer[]> {
    return this.repository.save(marketServers as MarketServer[]);
  }

  /**
   * Delete a market server by name
   * @param name Market server name
   */
  async delete(name: string): Promise<boolean> {
    const result = await this.repository.delete({ name });
    return result.affected !== undefined && result.affected > 0;
  }
}

export default MarketServerRepository;
