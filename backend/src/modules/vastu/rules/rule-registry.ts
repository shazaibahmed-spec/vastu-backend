import { RoomTypeEnum } from '../../../common/constants/index.js';
import { VastuRuleDefinition } from '../types/vastu-rule.interface.js';
import { BEDROOM_RULES } from './bedroom.rules.js';
import { ENTRANCE_RULES } from './entrance.rules.js';
import { KITCHEN_RULES } from './kitchen.rules.js';
import { LIVING_ROOM_RULES } from './living-room.rules.js';
import { OFFICE_RULES } from './office.rules.js';

export class VastuRuleRegistry {
  private static readonly rulesMap: Map<string, VastuRuleDefinition> = new Map();
  private static readonly roomRulesMap: Map<RoomTypeEnum, VastuRuleDefinition[]> =
    new Map();

  static {
    const allRules: VastuRuleDefinition[] = [
      ...BEDROOM_RULES,
      ...KITCHEN_RULES,
      ...ENTRANCE_RULES,
      ...LIVING_ROOM_RULES,
      ...OFFICE_RULES,
    ];

    for (const rule of allRules) {
      this.rulesMap.set(rule.code, rule);

      const existing = this.roomRulesMap.get(rule.roomType) || [];
      existing.push(rule);
      this.roomRulesMap.set(rule.roomType, existing);
    }
  }

  static getRulesForRoom(roomType: RoomTypeEnum): VastuRuleDefinition[] {
    const rules = this.roomRulesMap.get(roomType) || [];
    return rules.filter((r) => r.isActive);
  }

  static getRuleByCode(code: string): VastuRuleDefinition | undefined {
    return this.rulesMap.get(code);
  }

  static getAllRules(): VastuRuleDefinition[] {
    return Array.from(this.rulesMap.values());
  }
}
