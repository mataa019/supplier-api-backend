import { IsEmail, IsNotEmpty, IsString, MinLength, IsEnum, IsPhoneNumber, IsOptional } from 'class-validator';

export enum Role {
  supplier = 'supplier',
  admin = 'admin',
  manager = 'manager',
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @IsString()
  @IsNotEmpty()
  registrationNumber: string;

  @IsString()
  @IsNotEmpty()
  tpin: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role = Role.supplier;
}
