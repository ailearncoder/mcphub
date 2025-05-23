import { Request, Response } from 'express';
import {
  searchToolsByVector,
  getAllVectorizedTools,
  saveAllServerToolsAsVectorEmbeddings,
  saveToolsAsVectorEmbeddings,
} from '../services/vectorSearchService.js';
import { getServersInfo } from '../services/serverConfigAdapter.js';

/**
 * Search tools using vector similarity
 */
export const searchTools = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, limit = 10, threshold = 0.7, servers } = req.query;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Query parameter is required and must be a string',
      });
      return;
    }

    const limitNum = Math.min(Math.max(parseInt(limit as string) || 10, 1), 100);
    const thresholdNum = Math.min(Math.max(parseFloat(threshold as string) || 0.7, 0), 1);

    let serverNames: string[] | undefined;
    if (servers) {
      if (typeof servers === 'string') {
        serverNames = servers
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (Array.isArray(servers)) {
        serverNames = servers.map((s) => String(s).trim()).filter(Boolean);
      }
    }

    const results = await searchToolsByVector(query, limitNum, thresholdNum, serverNames);

    res.json({
      success: true,
      data: {
        query,
        results,
        total: results.length,
        limit: limitNum,
        threshold: thresholdNum,
        servers: serverNames,
      },
    });
  } catch (error) {
    console.error('Error in searchTools:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get all vectorized tools
 */
export const getAllTools = async (req: Request, res: Response): Promise<void> => {
  try {
    const { servers } = req.query;

    let serverNames: string[] | undefined;
    if (servers) {
      if (typeof servers === 'string') {
        serverNames = servers
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (Array.isArray(servers)) {
        serverNames = servers.map((s) => String(s).trim()).filter(Boolean);
      }
    }

    const results = await getAllVectorizedTools(serverNames);

    res.json({
      success: true,
      data: {
        tools: results,
        total: results.length,
        servers: serverNames,
      },
    });
  } catch (error) {
    console.error('Error in getAllTools:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Rebuild vector embeddings for all tools
 */
export const rebuildEmbeddings = async (req: Request, res: Response): Promise<void> => {
  try {
    await saveAllServerToolsAsVectorEmbeddings();

    res.json({
      success: true,
      message: 'Vector embeddings rebuilt successfully',
    });
  } catch (error) {
    console.error('Error in rebuildEmbeddings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rebuild vector embeddings',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Rebuild vector embeddings for a specific server
 */
export const rebuildServerEmbeddings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serverName } = req.params;

    if (!serverName) {
      res.status(400).json({
        success: false,
        message: 'Server name is required',
      });
      return;
    }

    // Get server info
    const servers = await getServersInfo();
    const server = servers.find((s) => s.name === serverName);

    if (!server) {
      res.status(404).json({
        success: false,
        message: `Server '${serverName}' not found`,
      });
      return;
    }

    if (server.status !== 'connected' || server.enabled === false) {
      res.status(400).json({
        success: false,
        message: `Server '${serverName}' is not active or enabled`,
      });
      return;
    }

    if (!server.tools || server.tools.length === 0) {
      res.status(400).json({
        success: false,
        message: `Server '${serverName}' has no tools to vectorize`,
      });
      return;
    }

    await saveToolsAsVectorEmbeddings(serverName, server.tools);

    res.json({
      success: true,
      message: `Vector embeddings rebuilt for server '${serverName}'`,
      data: {
        serverName,
        toolsCount: server.tools.length,
      },
    });
  } catch (error) {
    console.error('Error in rebuildServerEmbeddings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rebuild server vector embeddings',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get vector search statistics
 */
export const getVectorStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const allTools = await getAllVectorizedTools();
    const servers = await getServersInfo();

    // Group by server
    const toolsByServer = allTools.reduce(
      (acc, tool) => {
        if (!acc[tool.serverName]) {
          acc[tool.serverName] = [];
        }
        acc[tool.serverName].push(tool);
        return acc;
      },
      {} as Record<string, typeof allTools>,
    );

    // Calculate stats
    const stats = {
      totalVectorizedTools: allTools.length,
      totalActiveServers: servers.filter((s) => s.status === 'connected' && s.enabled !== false)
        .length,
      totalServersWithTools: Object.keys(toolsByServer).length,
      serverStats: Object.entries(toolsByServer).map(([serverName, tools]) => ({
        serverName,
        toolsCount: tools.length,
        isActive: servers.find((s) => s.name === serverName)?.status === 'connected',
      })),
      lastUpdated: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error in getVectorStats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vector search statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
