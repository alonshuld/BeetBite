import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CorporationsModule } from './corporations/corporations.module';

@Module({
  imports: [DatabaseModule, CorporationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
