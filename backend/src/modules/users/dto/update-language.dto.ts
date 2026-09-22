import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SupportedLanguageEnum } from '../../../common/constants/index.js';

export class UpdateLanguageDto {
  @ApiProperty({
    enum: SupportedLanguageEnum,
    example: SupportedLanguageEnum.HINDI,
    description: 'Preferred language code (en, hi, ta, te, kn, ml, bn, gu, mr, pa)',
  })
  @IsEnum(SupportedLanguageEnum, {
    message:
      'languageCode must be one of: en, hi, ta, te, kn, ml, bn, gu, mr, pa',
  })
  languageCode!: SupportedLanguageEnum;
}
