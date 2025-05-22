import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'server_configs' })
export class ServerConfig {
  @PrimaryColumn({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  type: 'stdio' | 'sse' | 'streamable-http';

  @Column({ type: 'varchar', nullable: true })
  url: string;

  @Column({ type: 'varchar', nullable: true })
  command: string;

  @Column({ type: 'simple-json', nullable: true })
  args: string[];

  @Column({ type: 'simple-json', nullable: true })
  env: Record<string, string>;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}

export default ServerConfig;
