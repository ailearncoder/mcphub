import { VectorEmbedding } from '../entities/VectorEmbedding.js';
import BaseRepository from './BaseRepository.js';
import { AppDataSource } from '../connection.js';

export class VectorEmbeddingRepository extends BaseRepository<VectorEmbedding> {
  constructor() {
    super(VectorEmbedding);
  }

  /**
   * Find by content type and ID
   * @param contentType Content type
   * @param contentId Content ID
   */
  async findByContentIdentity(
    contentType: string,
    contentId: string,
  ): Promise<VectorEmbedding | null> {
    return this.repository.findOneBy({
      content_type: contentType,
      content_id: contentId,
    });
  }

  /**
   * Create or update an embedding for content
   * @param contentType Content type
   * @param contentId Content ID
   * @param textContent Text content to embed
   * @param embedding Vector embedding
   * @param metadata Additional metadata
   * @param model Model used to create the embedding
   */
  async saveEmbedding(
    contentType: string,
    contentId: string,
    textContent: string,
    embedding: number[],
    metadata: Record<string, any> = {},
    model = 'default',
  ): Promise<VectorEmbedding> {
    // Check if embedding exists
    let vectorEmbedding = await this.findByContentIdentity(contentType, contentId);

    if (!vectorEmbedding) {
      vectorEmbedding = new VectorEmbedding();
      vectorEmbedding.content_type = contentType;
      vectorEmbedding.content_id = contentId;
    }

    // Update properties
    vectorEmbedding.text_content = textContent;
    vectorEmbedding.embedding = embedding;
    vectorEmbedding.dimensions = embedding.length;
    vectorEmbedding.metadata = metadata;
    vectorEmbedding.model = model;

    return this.save(vectorEmbedding);
  }

  /**
   * Search for similar embeddings using cosine similarity
   * @param embedding Vector embedding to search against
   * @param limit Maximum number of results (default: 10)
   * @param threshold Similarity threshold (default: 0.7)
   * @param contentTypes Optional content types to filter by
   */
  async searchSimilar(
    embedding: number[],
    limit = 10,
    threshold = 0.7,
    contentTypes?: string[],
  ): Promise<Array<{ embedding: VectorEmbedding; similarity: number }>> {
    // Build query
    let query = AppDataSource.createQueryBuilder()
      .select('vector_embedding.*')
      .addSelect(`1 - (vector_embedding.embedding <=> :embedding) AS similarity`)
      .from(VectorEmbedding, 'vector_embedding')
      .where(`1 - (vector_embedding.embedding <=> :embedding) > :threshold`)
      .orderBy('similarity', 'DESC')
      .limit(limit)
      .setParameter('embedding', `[${embedding.join(',')}]`)
      .setParameter('threshold', threshold);

    // Add content type filter if provided
    if (contentTypes && contentTypes.length > 0) {
      query = query
        .andWhere('vector_embedding.content_type IN (:...contentTypes)')
        .setParameter('contentTypes', contentTypes);
    }

    // Execute query
    const results = await query.getRawMany();

    // Map results to the expected format
    return results.map((row) => ({
      embedding: this.mapRawToEntity(row),
      similarity: parseFloat(row.similarity),
    }));
  }

  /**
   * Search by text using vector similarity
   * @param text Text to search for
   * @param getEmbeddingFunc Function to convert text to embedding
   * @param limit Maximum number of results
   * @param threshold Similarity threshold
   * @param contentTypes Optional content types to filter by
   */
  async searchByText(
    text: string,
    getEmbeddingFunc: (text: string) => Promise<number[]>,
    limit = 10,
    threshold = 0.7,
    contentTypes?: string[],
  ): Promise<Array<{ embedding: VectorEmbedding; similarity: number }>> {
    try {
      // Get embedding for the search text
      const embedding = await getEmbeddingFunc(text);

      // Search by embedding
      return this.searchSimilar(embedding, limit, threshold, contentTypes);
    } catch (error) {
      console.error('Error searching by text:', error);
      return [];
    }
  }

  /**
   * Map raw database result to entity
   * @param raw Raw database result
   */
  private mapRawToEntity(raw: any): VectorEmbedding {
    const entity = new VectorEmbedding();
    entity.id = raw.id;
    entity.content_type = raw.content_type;
    entity.content_id = raw.content_id;
    entity.text_content = raw.text_content;
    entity.metadata = raw.metadata;
    entity.embedding = raw.embedding;
    entity.dimensions = raw.dimensions;
    entity.model = raw.model;
    entity.createdAt = raw.created_at;
    entity.updatedAt = raw.updated_at;
    return entity;
  }
}

export default VectorEmbeddingRepository;
