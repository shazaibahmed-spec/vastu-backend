import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        deletedAt: null,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        languageCode: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name?: string;
    languageCode?: string;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        name: data.name,
        languageCode: data.languageCode || 'en',
      },
      select: {
        id: true,
        email: true,
        name: true,
        languageCode: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async updateLanguagePreference(userId: string, languageCode: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { languageCode },
      select: {
        id: true,
        email: true,
        name: true,
        languageCode: true,
        role: true,
      },
    });
  }
}
