import { shouldUseDatabase, getRepositoryFactory } from '../db/index.js';
import { VectorEmbeddingRepository } from '../db/repositories/index.js';
import { ServerInfo, ToolInfo } from '../types/index.js';
import { getServersInfo } from './serverConfigAdapter.js';
import { AppDataSource } from '../db/connection.js';
import OpenAI from 'openai';

// Environment variables for embedding configuration
const EMBEDDING_ENV = {
  // The embedding model to use - default to OpenAI but allow BAAI/BGE models
  MODEL:
    process.env.EMBEDDING_MODEL ||
    process.env.OPENAI_API_EMBEDDING_MODEL ||
    'text-embedding-3-small',
  // Detect if using a BGE model from the environment variable
  IS_BGE_MODEL: !!(process.env.EMBEDDING_MODEL && process.env.EMBEDDING_MODEL.includes('bge')),
};

// Constants for embedding models
const EMBEDDING_MODEL = EMBEDDING_ENV.MODEL;
const EMBEDDING_DIMENSIONS = 1536; // OpenAI's text-embedding-3-small outputs 1536 dimensions
const BGE_DIMENSIONS = 1024; // BAAI/bge-m3 outputs 1024 dimensions
const FALLBACK_DIMENSIONS = 100; // Fallback implementation uses 100 dimensions

// Get dimensions for a model
const getDimensionsForModel = (model: string): number => {
  if (model.includes('bge-m3')) {
    return BGE_DIMENSIONS;
  } else if (model.includes('text-embedding-3')) {
    return EMBEDDING_DIMENSIONS;
  } else if (model === 'fallback' || model === 'simple-hash') {
    return FALLBACK_DIMENSIONS;
  }
  // Default to OpenAI dimensions
  return EMBEDDING_DIMENSIONS;
};

// Determine which dimensions to use by default based on the selected model
const DEFAULT_DIMENSIONS = getDimensionsForModel(EMBEDDING_MODEL);

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Get API key from environment variables
  baseURL: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1', // Default OpenAI API base URL
});

/**
 * Generate text embedding using OpenAI's embedding model
 *
 * NOTE: OpenAI embeddings are 1536 dimensions by default.
 * If you previously used the fallback implementation (100 dimensions),
 * you may need to rebuild your vector database indices after switching.
 *
 * @param text Text to generate embeddings for
 * @returns Promise with vector embedding as number array
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Check if API key is configured
    if (!openai.apiKey) {
      console.warn('OpenAI API key is not configured. Using fallback embedding method.');
      return generateFallbackEmbedding(text);
    }

    // Truncate text if it's too long (OpenAI has token limits)
    const truncatedText = text.length > 8000 ? text.substring(0, 8000) : text;

    // Call OpenAI's embeddings API
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL, // Modern model with better performance
      input: truncatedText,
    });

    // Log successful embedding generation in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `Generated OpenAI embedding with ${response.data[0].embedding.length} dimensions for text: "${truncatedText.substring(0, 50)}${truncatedText.length > 50 ? '...' : ''}"`,
      );
    }

    // Return the embedding
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating OpenAI embedding:', error);
    console.warn('Falling back to simple embedding method');
    return generateFallbackEmbedding(text);
  }
}

/**
 * Fallback embedding function using a simple approach when OpenAI API is unavailable
 * @param text Text to generate embeddings for
 * @returns Vector embedding as number array
 */
function generateFallbackEmbedding(text: string): number[] {
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

  // Create vector with fallback dimensions
  const vector = new Array(FALLBACK_DIMENSIONS).fill(0);

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

      try {
        // Generate embedding
        const embedding = await generateEmbedding(searchableText);

        // Check database compatibility before saving
        if (shouldUseDatabase('vectorEmbeddings')) {
          await checkDatabaseVectorDimensions(embedding.length);
        }

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
          EMBEDDING_MODEL,
        );
      } catch (toolError) {
        console.error(`Error processing tool ${tool.name} for server ${serverName}:`, toolError);
        // Continue with the next tool rather than failing the whole batch
      }
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
      filteredResults = results.filter((result) => {
        if (typeof result.embedding.metadata === 'string') {
          try {
            const parsedMetadata = JSON.parse(result.embedding.metadata);
            return serverNames.includes(parsedMetadata.serverName);
          } catch (error) {
            return false;
          }
        }
        return false;
      });
    }

    // Transform results to a more useful format
    return filteredResults.map((result) => {
      // Check if we have metadata as a string that needs to be parsed
      if (result.embedding?.metadata && typeof result.embedding.metadata === 'string') {
        try {
          // Parse the metadata string as JSON
          const parsedMetadata = JSON.parse(result.embedding.metadata);

          if (parsedMetadata.serverName && parsedMetadata.toolName) {
            // We have properly structured metadata
            return {
              serverName: parsedMetadata.serverName,
              toolName: parsedMetadata.toolName,
              description: parsedMetadata.description || '',
              inputSchema: parsedMetadata.inputSchema || {},
              similarity: result.similarity,
              searchableText: result.embedding.text_content,
            };
          }
        } catch (error) {
          console.error('Error parsing metadata string:', error);
          // Fall through to the extraction logic below
        }
      }

      // Extract tool info from text_content if metadata is not available or parsing failed
      const textContent = result.embedding?.text_content || '';

      // Extract toolName (first word of text_content)
      const toolNameMatch = textContent.match(/^(\S+)/);
      const toolName = toolNameMatch ? toolNameMatch[1] : '';

      // Extract serverName from toolName if it follows the pattern "serverName_toolPart"
      const serverNameMatch = toolName.match(/^([^_]+)_/);
      const serverName = serverNameMatch ? serverNameMatch[1] : 'unknown';

      // Extract description (everything after the first word)
      const description = textContent.replace(/^\S+\s*/, '').trim();

      return {
        serverName,
        toolName,
        description,
        inputSchema: {},
        similarity: result.similarity,
        searchableText: textContent,
      };
    });
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

    // Try to determine what dimension our database is using
    let dimensionsToUse = DEFAULT_DIMENSIONS; // Default based on the model selected

    try {
      const result = await AppDataSource.query(`
        SELECT atttypmod as dimensions
        FROM pg_attribute 
        WHERE attrelid = 'vector_embeddings'::regclass 
        AND attname = 'embedding'
      `);

      if (result && result.length > 0 && result[0].dimensions) {
        const dbDimensions = result[0].dimensions > 0 ? result[0].dimensions - 4 : 0;
        if (dbDimensions > 0) {
          dimensionsToUse = dbDimensions;
        }
      }
    } catch (error: any) {
      console.warn('Could not determine vector dimensions from database:', error?.message);
    }

    // Get all tool embeddings
    const results = await vectorRepository.searchSimilar(
      new Array(dimensionsToUse).fill(0), // Zero vector with dimensions matching the database
      1000, // Large limit
      -1, // No threshold (get all)
      ['tool'],
    );

    // Filter by server names if provided
    let filteredResults = results;
    if (serverNames && serverNames.length > 0) {
      filteredResults = results.filter((result) => {
        if (typeof result.embedding.metadata === 'string') {
          try {
            const parsedMetadata = JSON.parse(result.embedding.metadata);
            return serverNames.includes(parsedMetadata.serverName);
          } catch (error) {
            return false;
          }
        }
        return false;
      });
    }

    // Transform results
    return filteredResults.map((result) => {
      if (typeof result.embedding.metadata === 'string') {
        try {
          const parsedMetadata = JSON.parse(result.embedding.metadata);
          return {
            serverName: parsedMetadata.serverName,
            toolName: parsedMetadata.toolName,
            description: parsedMetadata.description,
            inputSchema: parsedMetadata.inputSchema,
          };
        } catch (error) {
          console.error('Error parsing metadata string:', error);
          return {
            serverName: 'unknown',
            toolName: 'unknown',
            description: '',
            inputSchema: {},
          };
        }
      }
      return {
        serverName: 'unknown',
        toolName: 'unknown',
        description: '',
        inputSchema: {},
      };
    });
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

/**
 * Check database vector dimensions and ensure compatibility
 * @param dimensionsNeeded The number of dimensions required
 * @returns Promise that resolves when check is complete
 */
async function checkDatabaseVectorDimensions(dimensionsNeeded: number): Promise<void> {
  try {
    // First check if database is initialized
    if (!AppDataSource.isInitialized) {
      console.warn('Database not initialized, skipping vector dimension check');
      return;
    }

    // Check current vector dimension in the database
    const result = await AppDataSource.query(`
      SELECT atttypmod as dimensions
      FROM pg_attribute 
      WHERE attrelid = 'vector_embeddings'::regclass 
      AND attname = 'embedding'
    `);

    let currentDimensions = 0;

    // Parse dimensions from result
    if (result && result.length > 0 && result[0].dimensions) {
      // atttypmod is -1 if no dimensions specified or dimensions+4 if specified
      currentDimensions = result[0].dimensions > 0 ? result[0].dimensions - 4 : 0;
    }

    // If no dimensions are set or they don't match what we need, try to alter the table
    if (currentDimensions === 0 || currentDimensions !== dimensionsNeeded) {
      console.log(
        `Vector dimensions mismatch: database=${currentDimensions}, needed=${dimensionsNeeded}`,
      );
      console.log('Attempting to alter vector dimensions...');

      // Drop any existing indices first
      await AppDataSource.query(`DROP INDEX IF EXISTS idx_vector_embeddings_embedding;`);

      // Alter the column type with the new dimensions
      await AppDataSource.query(`
        ALTER TABLE vector_embeddings 
        ALTER COLUMN embedding TYPE vector(${dimensionsNeeded});
      `);

      // Create a new index
      await AppDataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_vector_embeddings_embedding 
        ON vector_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
      `);

      console.log(`Successfully altered vector dimensions to ${dimensionsNeeded}`);
    }
  } catch (error: any) {
    console.error('Error checking/updating vector dimensions:', error);
    throw new Error(`Vector dimension check failed: ${error?.message || 'Unknown error'}`);
  }
}
