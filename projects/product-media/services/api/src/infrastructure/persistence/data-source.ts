import { DataSource } from 'typeorm';
import { loadConfiguration } from '../../config/configuration';
import { MediaEntity } from './media.entity';
import { CreateMediaTable1700000000000 } from '../../migrations/1700000000000-create-media-table';

const configuration = loadConfiguration();

export default new DataSource({
  type: 'postgres',
  url: configuration.DATABASE_URL,
  entities: [MediaEntity],
  migrations: [CreateMediaTable1700000000000],
  synchronize: false,
});

