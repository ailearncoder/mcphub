import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'market_servers' })
export class MarketServer {
  @PrimaryColumn({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  display_name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'simple-json' })
  repository: {
    type: string;
    url: string;
  };

  @Column({ type: 'varchar' })
  homepage: string;

  @Column({ type: 'simple-json' })
  author: {
    name: string;
  };

  @Column({ type: 'varchar' })
  license: string;

  @Column({ type: 'simple-array' })
  categories: string[];

  @Column({ type: 'simple-array' })
  tags: string[];

  @Column({ type: 'simple-json' })
  examples: Array<{
    title: string;
    description: string;
    prompt: string;
  }>;

  @Column({ type: 'simple-json' })
  installations: Record<
    string,
    {
      type: string;
      command: string;
      args: string[];
      env?: Record<string, string>;
    }
  >;

  @Column({ type: 'simple-json' })
  arguments: Record<
    string,
    {
      description: string;
      required: boolean;
      example: string;
    }
  >;

  @Column({ type: 'simple-json' })
  tools: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, any>;
  }>;

  @Column({ type: 'boolean', default: false })
  is_official: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}

export default MarketServer;
