import { IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  login: string;

  @IsString()
  @MinLength(8)
  password: string;
}
