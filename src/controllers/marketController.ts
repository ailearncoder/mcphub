import { Request, Response } from 'express';
import { ApiResponse } from '../types/index.js';
import {
  getMarketServers,
  getMarketServerByName,
  getMarketCategories,
  getMarketTags,
  searchMarketServers,
  filterMarketServersByCategory,
  filterMarketServersByTag,
} from '../services/marketServerAdapter.js';

// Get all market servers
export const getAllMarketServers = async (_: Request, res: Response): Promise<void> => {
  try {
    const marketServersObj = await getMarketServers();
    const marketServers = Object.values(marketServersObj);
    const response: ApiResponse = {
      success: true,
      data: marketServers,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get market servers information',
    });
  }
};

// Get a specific market server by name
export const getMarketServer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.params;
    if (!name) {
      res.status(400).json({
        success: false,
        message: 'Server name is required',
      });
      return;
    }

    const server = await getMarketServerByName(name);
    if (!server) {
      res.status(404).json({
        success: false,
        message: 'Market server not found',
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: server,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get market server information',
    });
  }
};

// Get all market categories
export const getAllMarketCategories = async (_: Request, res: Response): Promise<void> => {
  try {
    const categories = await getMarketCategories();
    const response: ApiResponse = {
      success: true,
      data: categories,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get market categories',
    });
  }
};

// Get all market tags
export const getAllMarketTags = async (_: Request, res: Response): Promise<void> => {
  try {
    const tags = await getMarketTags();
    const response: ApiResponse = {
      success: true,
      data: tags,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get market tags',
    });
  }
};

// Search market servers
export const searchMarketServersByQuery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.query;
    const searchQuery = typeof query === 'string' ? query : '';

    const servers = await searchMarketServers(searchQuery);
    const response: ApiResponse = {
      success: true,
      data: servers,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search market servers',
    });
  }
};

// Filter market servers by category
export const getMarketServersByCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.params;

    const servers = await filterMarketServersByCategory(category);
    const response: ApiResponse = {
      success: true,
      data: servers,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to filter market servers by category',
    });
  }
};

// Filter market servers by tag
export const getMarketServersByTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tag } = req.params;

    const servers = await filterMarketServersByTag(tag);
    const response: ApiResponse = {
      success: true,
      data: servers,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to filter market servers by tag',
    });
  }
};
