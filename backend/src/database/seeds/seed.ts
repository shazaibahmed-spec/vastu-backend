import { PrismaClient } from '@prisma/client';
import { VastuRuleRegistry } from '../../modules/vastu/rules/rule-registry.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Vastu AI database with classical rulebook...');

  // 0. Seed default demo user for guest/developer analysis
  const demoUser = await prisma.user.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'dev@vastu.local',
      passwordHash: '$2b$12$eX9K3jF6vM8qW0gH8wT8.uA3Yw0sQ6xJ7rL2mN1oP0qR3sT4uV5wX',
      name: 'Local Dev User',
      role: 'USER',
    },
  });
  console.log(`👤 Seeded demo user: ${demoUser.email} (${demoUser.id})`);

  // 1. Create or get Rule Version 1.0.0
  const version = await prisma.vastuRuleVersion.upsert({
    where: { versionNumber: '1.0.0' },
    update: { isCurrent: true },
    create: {
      versionNumber: '1.0.0',
      releaseNotes: 'Canonical classical Vastu Shastra ruleset v1.0.0 for 5 spaces.',
      isCurrent: true,
      publishedAt: new Date(),
    },
  });

  console.log(`📦 Active Rule Version: ${version.versionNumber} (${version.id})`);

  // 2. Seed all rules from VastuRuleRegistry
  const allRules = VastuRuleRegistry.getAllRules();
  let seededCount = 0;

  for (const rule of allRules) {
    await prisma.vastuRule.upsert({
      where: {
        code_versionId: {
          code: rule.code,
          versionId: version.id,
        },
      },
      update: {
        roomType: rule.roomType as any,
        category: rule.category,
        name: rule.name,
        description: rule.description,
        targetObject: rule.targetObject,
        conditionJson: rule.condition as any,
        severity: rule.severity as any,
        verdictOnMatch: rule.verdictOnMatch as any,
        defaultRemedy: rule.defaultRemedy,
        isActive: rule.isActive,
      },
      create: {
        versionId: version.id,
        code: rule.code,
        roomType: rule.roomType as any,
        category: rule.category,
        name: rule.name,
        description: rule.description,
        targetObject: rule.targetObject,
        conditionJson: rule.condition as any,
        severity: rule.severity as any,
        verdictOnMatch: rule.verdictOnMatch as any,
        defaultRemedy: rule.defaultRemedy,
        isActive: rule.isActive,
      },
    });

    seededCount++;
  }

  console.log(`✅ Successfully seeded ${seededCount} Vastu rules into database!`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
