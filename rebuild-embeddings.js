#!/usr/bin/env node

/**
 * Script to rebuild vector embeddings when changing embedding models
 * Run with: node rebuild-embeddings.js
 */

import dotenv from 'dotenv';
import { initializeDatabase } from './src/db/connection.js';
import { saveAllServerToolsAsVectorEmbeddings } from './src/services/vectorSearchService.js';

// Load environment variables
dotenv.config();

async function rebuildEmbeddings() {
  console.log('Starting embedding rebuild process...');

  // Initialize database connection
  console.log('Connecting to database...');
  try {
    await initializeDatabase();
    console.log('Database connection established');

    // Rebuild all embeddings
    console.log('Rebuilding all embeddings with the configured model...');
    await saveAllServerToolsAsVectorEmbeddings();

    console.log('✅ Embedding rebuild process completed successfully!');
    console.log(
      `Current embedding model: ${process.env.EMBEDDING_MODEL || 'text-embedding-3-small (default)'}`,
    );
  } catch (error) {
    console.error('❌ Error during embedding rebuild:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

rebuildEmbeddings();
