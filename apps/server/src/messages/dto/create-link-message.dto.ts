import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateLinkMessageDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
  })
  @MaxLength(2000)
  url!: string;
}
