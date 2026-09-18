import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMediaTable1700000000000 implements MigrationInterface {
  name = 'CreateMediaTable1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'media',
        columns: [
          { name: 'media_id', type: 'uuid', isPrimary: true },
          { name: 'filename', type: 'text', isNullable: false },
          { name: 'size_bytes', type: 'bigint', isNullable: false },
          { name: 'status', type: 'varchar', length: '16', isNullable: false },
          { name: 'progress', type: 'int', isNullable: false, default: 0 },
          { name: 'source_width', type: 'int', isNullable: true },
          { name: 'source_height', type: 'int', isNullable: true },
          { name: 'duration_seconds', type: 'double precision', isNullable: true },
          { name: 'renditions', type: 'jsonb', isNullable: false, default: "'[]'::jsonb" },
          { name: 'thumbnail_path', type: 'text', isNullable: true },
          { name: 'attempt_id', type: 'uuid', isNullable: true },
          { name: 'error_message', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamptz', isNullable: false },
          { name: 'updated_at', type: 'timestamptz', isNullable: false },
          { name: 'expires_at', type: 'timestamptz', isNullable: false },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'media',
      new TableIndex({ name: 'idx_media_created_at', columnNames: ['created_at'] }),
    );
    await queryRunner.createIndex(
      'media',
      new TableIndex({ name: 'idx_media_status', columnNames: ['status'] }),
    );
    await queryRunner.createIndex(
      'media',
      new TableIndex({ name: 'idx_media_expires_at', columnNames: ['expires_at'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('media', true);
  }
}


