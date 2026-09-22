import { Module } from '@nestjs/common';
import { VastuController } from './controllers/vastu.controller.js';
import { VastuRulesEngine } from './engine/vastu-rules-engine.js';
import { VastuWisdomService } from './services/vastu-wisdom.service.js';

@Module({
  controllers: [VastuController],
  providers: [VastuRulesEngine, VastuWisdomService],
  exports: [VastuRulesEngine, VastuWisdomService],
})
export class VastuModule {}
