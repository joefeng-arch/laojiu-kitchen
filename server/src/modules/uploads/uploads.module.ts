import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ContentModule } from '../content/content.module';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [PassportModule, ContentModule],
  controllers: [UploadsController],
})
export class UploadsModule {}
