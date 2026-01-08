import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CorporationsModule } from './corporations/corporations.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // This makes process.env available everywhere
      envFilePath: '.env', // Path relative to where you run the 'nest start' command
    }),
    DatabaseModule,
    CorporationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
