import 'reflect-metadata'; // Ensure reflect-metadata is imported here too
import { DataSource, DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import path from 'path';
import { fileURLToPath } from 'url';
import entities from './entities/index.js';
import { registerPostgresVectorType } from './types/postgresVectorType.js';
import { VectorEmbeddingSubscriber } from './subscribers/VectorEmbeddingSubscriber.js';

// Load environment variables with expansion
const env = dotenv.config();
dotenvExpand.expand(env);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default database configuration
const defaultConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'mcphub',
  synchronize: process.env.NODE_ENV !== 'production', // Auto-create schema in development
  logging: process.env.DB_LOGGING === 'true',
  entities: entities,
  subscribers: [VectorEmbeddingSubscriber], // Add the vector embedding subscriber
  ssl:
    process.env.DB_SSL === 'true'
      ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        }
      : false,
};

// AppDataSource is the TypeORM data source
export const AppDataSource = new DataSource(defaultConfig);

// Initialize database connection
export const initializeDatabase = async (): Promise<DataSource> => {
  try {
    if (!AppDataSource.isInitialized) {
      console.log('Initializing database connection...');
      await AppDataSource.initialize();

      // Register the vector type with TypeORM
      registerPostgresVectorType(AppDataSource);

      // Create pgvector extension if it doesn't exist
      await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS vector;').catch((err) => {
        console.warn('Failed to create vector extension:', err.message);
        console.warn('Vector functionality may not be available.');
      });

      // Set up vector column and index with a more direct approach
      try {
        // First, create the extension
        await AppDataSource.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

        // Check if table exists first
        const tableExists = await AppDataSource.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_name = 'vector_embeddings'
          );
        `);

        if (tableExists[0].exists) {
          // Add pgvector support via raw SQL commands
          console.log('Configuring vector support for embeddings table...');

          // Step 1: Drop any existing index on the column
          try {
            await AppDataSource.query(`DROP INDEX IF EXISTS idx_vector_embeddings_embedding;`);
          } catch (dropError: any) {
            console.warn('Note: Could not drop existing index:', dropError.message);
          }

          // Step 2: Alter column type to vector (if it's not already)
          try {
            // Check column type first
            const columnType = await AppDataSource.query(`
              SELECT data_type FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'vector_embeddings'
              AND column_name = 'embedding';
            `);

            if (columnType.length > 0 && columnType[0].data_type !== 'vector') {
              await AppDataSource.query(`
                ALTER TABLE vector_embeddings 
                ALTER COLUMN embedding TYPE vector USING embedding::vector;
              `);
              console.log('Vector embedding column type updated successfully.');
            }
          } catch (alterError: any) {
            console.warn('Could not alter embedding column type:', alterError.message);
            console.warn('Will try to recreate the table later.');
          }

          // Step 3: Try to create appropriate indices
          try {
            // First, let's check if there are any records to determine the dimensions
            const records = await AppDataSource.query(`
              SELECT dimensions FROM vector_embeddings LIMIT 1;
            `);

            let dimensions = 1536; // Default to common OpenAI embedding size
            if (records && records.length > 0 && records[0].dimensions) {
              dimensions = records[0].dimensions;
              console.log(`Found vector dimension from database: ${dimensions}`);
            } else {
              console.log(`Using default vector dimension: ${dimensions}`);
            }

            // Set the vector dimensions explicitly
            await AppDataSource.query(`
              ALTER TABLE vector_embeddings 
              ALTER COLUMN embedding TYPE vector(${dimensions});
            `);

            // Now try to create the index
            await AppDataSource.query(`
              CREATE INDEX IF NOT EXISTS idx_vector_embeddings_embedding 
              ON vector_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
            `);
            console.log('Created IVFFlat index for vector similarity search.');
          } catch (indexError: any) {
            console.warn('IVFFlat index creation failed:', indexError.message);
            console.warn('Trying alternative index type...');

            try {
              // Try HNSW index instead
              await AppDataSource.query(`
                CREATE INDEX IF NOT EXISTS idx_vector_embeddings_embedding 
                ON vector_embeddings USING hnsw (embedding vector_cosine_ops);
              `);
              console.log('Created HNSW index for vector similarity search.');
            } catch (hnswError: any) {
              // Final fallback to simpler index type
              console.warn('HNSW index creation failed too. Using simple L2 distance index.');

              try {
                // Create a basic GIN index as last resort
                await AppDataSource.query(`
                  CREATE INDEX IF NOT EXISTS idx_vector_embeddings_embedding 
                  ON vector_embeddings USING gin (embedding);
                `);
                console.log('Created GIN index for basic vector lookups.');
              } catch (ginError: any) {
                console.warn('All index creation attempts failed:', ginError.message);
                console.warn('Vector search will be slower without an optimized index.');
              }
            }
          }
        } else {
          console.log(
            'Vector embeddings table does not exist yet - will configure after schema sync.',
          );
        }
      } catch (error: any) {
        console.warn('Could not set up vector column/index:', error.message);
        console.warn('Will attempt again after schema synchronization.');
      }

      console.log('Database connection established successfully.');

      // Run one final setup check after schema synchronization is done
      if (defaultConfig.synchronize) {
        setTimeout(async () => {
          try {
            console.log('Running final vector configuration check...');

            // Try setup again with the same code from above
            const tableExists = await AppDataSource.query(`
              SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public'
                AND table_name = 'vector_embeddings'
              );
            `);

            if (tableExists[0].exists) {
              console.log('Vector embeddings table found, checking configuration...');

              // Get the dimension size first
              try {
                // Try to get dimensions from an existing record
                const records = await AppDataSource.query(`
                  SELECT dimensions FROM vector_embeddings LIMIT 1;
                `);

                let dimensions = 1536; // Default to common OpenAI embedding size
                if (records && records.length > 0 && records[0].dimensions) {
                  dimensions = records[0].dimensions;
                  console.log(`Found vector dimension from database: ${dimensions}`);
                } else {
                  console.log(`Using default vector dimension: ${dimensions}`);
                }

                // Ensure column type is vector with explicit dimensions
                await AppDataSource.query(`
                  ALTER TABLE vector_embeddings 
                  ALTER COLUMN embedding TYPE vector(${dimensions});
                `);
                console.log('Vector embedding column type updated in final check.');

                // One more attempt at creating the index with dimensions
                try {
                  // Drop existing index if any
                  await AppDataSource.query(`
                    DROP INDEX IF EXISTS idx_vector_embeddings_embedding;
                  `);

                  // Create new index with proper dimensions
                  await AppDataSource.query(`
                    CREATE INDEX idx_vector_embeddings_embedding 
                    ON vector_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
                  `);
                  console.log('Created IVFFlat index in final check.');
                } catch (indexError: any) {
                  console.warn('Final index creation attempt did not succeed:', indexError.message);
                  console.warn('Using basic lookup without vector index.');
                }
              } catch (setupError: any) {
                console.warn('Vector setup in final check failed:', setupError.message);
              }
            }
          } catch (error: any) {
            console.warn('Post-initialization vector setup failed:', error.message);
          }
        }, 3000); // Give synchronize some time to complete
      }
    }
    return AppDataSource;
  } catch (error) {
    console.error('Error during database initialization:', error);
    throw error;
  }
};

// Get database connection status
export const isDatabaseConnected = (): boolean => {
  return AppDataSource.isInitialized;
};

// Close database connection
export const closeDatabase = async (): Promise<void> => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    console.log('Database connection closed.');
  }
};

export default AppDataSource;
