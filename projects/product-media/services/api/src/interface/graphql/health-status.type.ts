import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('HealthStatus')
export class HealthStatusType {
  @Field()
  status: string;

  @Field()
  database: boolean;

  @Field()
  queue: boolean;

  @Field()
  storage: boolean;
}

