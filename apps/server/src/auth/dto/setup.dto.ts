import { IsNotEmpty, IsString } from 'class-validator';

export class SetupDto {
  @IsString()
  @IsNotEmpty()
  password!: string;
}
