import { Module } from '@nestjs/common';
import { CompanySettingsService } from './company-settings.service';
import { CompanySettingsController } from './company-settings.controller';

@Module({
  controllers: [CompanySettingsController],
  providers: [CompanySettingsService],
  exports: [CompanySettingsService],
})
export class CompanySettingsModule {}
