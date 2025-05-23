import { shouldUseDatabase, getRepositoryFactory } from '../db/index.js';
import { VectorEmbeddingRepository } from '../db/repositories/index.js';
import { ServerInfo, ToolInfo } from '../types/index.js';
import { getServersInfo } from './serverConfigAdapter.js';

/**
 * Generate text embedding using a simple approach
 * This is a placeholder - in production, you'd use a real embedding service
 * like OpenAI, Cohere, or a local model
 */
async function generateEmbedding(text: string): Promise<number[]> {
  // This is a simple placeholder implementation
  // In a real implementation, you would call an embedding API
  // For now, we'll create a simple hash-based vector

  const words = text.toLowerCase().split(/\s+/);
  const vocabulary = [
    'search',
    'find',
    'get',
    'fetch',
    'retrieve',
    'query',
    'map',
    'location',
    'weather',
    'file',
    'directory',
    'email',
    'message',
    'send',
    'create',
    'update',
    'delete',
    'browser',
    'web',
    'page',
    'click',
    'navigate',
    'screenshot',
    'automation',
    'database',
    'table',
    'record',
    'insert',
    'select',
    'schema',
    'data',
    'image',
    'photo',
    'video',
    'media',
    'upload',
    'download',
    'convert',
    'text',
    'document',
    'pdf',
    'excel',
    'word',
    'format',
    'parse',
    'api',
    'rest',
    'http',
    'request',
    'response',
    'json',
    'xml',
    'time',
    'date',
    'calendar',
    'schedule',
    'reminder',
    'clock',
    'math',
    'calculate',
    'number',
    'sum',
    'average',
    'statistics',
    'user',
    'account',
    'login',
    'auth',
    'permission',
    'role',
  ];

  // Create a 100-dimensional vector
  const vector = new Array(100).fill(0);

  words.forEach((word) => {
    const index = vocabulary.indexOf(word);
    if (index >= 0 && index < vector.length) {
      vector[index] += 1;
    }
    // Add some randomness based on word hash
    const hash = word.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    vector[hash % vector.length] += 0.1;
  });

  // Normalize the vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    return vector.map((val) => val / magnitude);
  }

  return vector;
}

/**
 * Save tool information as vector embeddings
 * @param serverName Server name
 * @param tools Array of tools to save
 */
export const saveToolsAsVectorEmbeddings = async (
  serverName: string,
  tools: ToolInfo[],
): Promise<void> => {
  if (!shouldUseDatabase('vectorEmbeddings')) {
    console.log('Vector embeddings are disabled, skipping tool vectorization');
    return;
  }

  try {
    const vectorRepository = getRepositoryFactory(
      'vectorEmbeddings',
    )() as VectorEmbeddingRepository;

    for (const tool of tools) {
      // Create searchable text from tool information
      const searchableText = [
        tool.name,
        tool.description,
        // Include input schema properties if available
        ...(tool.inputSchema && typeof tool.inputSchema === 'object'
          ? Object.keys(tool.inputSchema).filter((key) => key !== 'type' && key !== 'properties')
          : []),
        // Include schema property names if available
        ...(tool.inputSchema &&
        tool.inputSchema.properties &&
        typeof tool.inputSchema.properties === 'object'
          ? Object.keys(tool.inputSchema.properties)
          : []),
      ]
        .filter(Boolean)
        .join(' ');

      // Generate embedding
      const embedding = await generateEmbedding(searchableText);

      // Save embedding
      await vectorRepository.saveEmbedding(
        'tool',
        `${serverName}:${tool.name}`,
        searchableText,
        embedding,
        {
          serverName,
          toolName: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        },
        'simple-hash',
      );
    }

    console.log(`Saved ${tools.length} tool embeddings for server: ${serverName}`);
  } catch (error) {
    console.error(`Error saving tool embeddings for server ${serverName}:`, error);
  }
};

/**
 * Save all current server tools as vector embeddings
 */
export const saveAllServerToolsAsVectorEmbeddings = async (): Promise<void> => {
  if (!shouldUseDatabase('vectorEmbeddings')) {
    console.log('Vector embeddings are disabled, skipping all tools vectorization');
    return;
  }

  try {
    const servers = await getServersInfo();
    const activeServers = servers.filter(
      (server) =>
        server.status === 'connected' &&
        server.enabled !== false &&
        server.tools &&
        server.tools.length > 0,
    );

    console.log(`Found ${activeServers.length} active servers with tools`);

    for (const server of activeServers) {
      await saveToolsAsVectorEmbeddings(server.name, server.tools);
    }

    console.log('Completed vectorization of all server tools');
  } catch (error) {
    console.error('Error saving all server tools as vector embeddings:', error);
  }
};

/**
 * Search for tools using vector similarity
 * @param query Search query text
 * @param limit Maximum number of results to return
 * @param threshold Similarity threshold (0-1)
 * @param serverNames Optional array of server names to filter by
 */
export const searchToolsByVector = async (
  query: string,
  limit: number = 10,
  threshold: number = 0.7,
  serverNames?: string[],
): Promise<
  Array<{
    serverName: string;
    toolName: string;
    description: string;
    inputSchema: any;
    similarity: number;
    searchableText: string;
  }>
> => {
  if (!shouldUseDatabase('vectorEmbeddings')) {
    console.log('Vector embeddings are disabled, returning empty results');
    return [];
  }

  try {
    const vectorRepository = getRepositoryFactory(
      'vectorEmbeddings',
    )() as VectorEmbeddingRepository;

    // Search by text using vector similarity
    const results = await vectorRepository.searchByText(
      query,
      generateEmbedding,
      limit,
      threshold,
      ['tool'],
    );

    // Filter by server names if provided
    let filteredResults = results;
    if (serverNames && serverNames.length > 0) {
      filteredResults = results.filter((result) =>
        serverNames.includes(result.embedding.metadata.serverName),
      );
    }

    // Transform results to a more useful format
    return filteredResults.map((result) => ({
      serverName: result.embedding.metadata.serverName,
      toolName: result.embedding.metadata.toolName,
      description: result.embedding.metadata.description,
      inputSchema: result.embedding.metadata.inputSchema,
      similarity: result.similarity,
      searchableText: result.embedding.text_content,
    }));
  } catch (error) {
    console.error('Error searching tools by vector:', error);
    return [];
  }
};

/**
 * Get all available tools in vector database
 * @param serverNames Optional array of server names to filter by
 */
export const getAllVectorizedTools = async (
  serverNames?: string[],
): Promise<
  Array<{
    serverName: string;
    toolName: string;
    description: string;
    inputSchema: any;
  }>
> => {
  if (!shouldUseDatabase('vectorEmbeddings')) {
    console.log('Vector embeddings are disabled, returning empty results');
    return [];
  }

  try {
    const vectorRepository = getRepositoryFactory(
      'vectorEmbeddings',
    )() as VectorEmbeddingRepository;

    // Get all tool embeddings
    const results = await vectorRepository.searchSimilar(
      new Array(100).fill(0), // Zero vector to get all results
      1000, // Large limit
      -1, // No threshold (get all)
      ['tool'],
    );

    // Filter by server names if provided
    let filteredResults = results;
    if (serverNames && serverNames.length > 0) {
      filteredResults = results.filter((result) =>
        serverNames.includes(result.embedding.metadata.serverName),
      );
    }

    // Transform results
    return filteredResults.map((result) => ({
      serverName: result.embedding.metadata.serverName,
      toolName: result.embedding.metadata.toolName,
      description: result.embedding.metadata.description,
      inputSchema: result.embedding.metadata.inputSchema,
    }));
  } catch (error) {
    console.error('Error getting all vectorized tools:', error);
    return [];
  }
};

/**
 * Remove tool embeddings for a server
 * @param serverName Server name
 */
export const removeServerToolEmbeddings = async (serverName: string): Promise<void> => {
  if (!shouldUseDatabase('vectorEmbeddings')) {
    return;
  }

  try {
    const vectorRepository = getRepositoryFactory(
      'vectorEmbeddings',
    )() as VectorEmbeddingRepository;

    // Note: This would require adding a delete method to VectorEmbeddingRepository
    // For now, we'll log that this functionality needs to be implemented
    console.log(`TODO: Remove tool embeddings for server: ${serverName}`);
  } catch (error) {
    console.error(`Error removing tool embeddings for server ${serverName}:`, error);
  }
};
