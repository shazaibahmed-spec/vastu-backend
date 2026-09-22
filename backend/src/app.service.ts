import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      appName: this.configService.get<string>('app.appName'),
      environment: this.configService.get<string>('app.nodeEnv'),
      version: '1.0.0',
    };
  }
}
