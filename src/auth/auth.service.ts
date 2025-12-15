import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import * as fs from 'fs/promises';
import * as path from 'path';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { TokenResponseDto } from './dto/token-response.dto';

interface UserData {
  login: string;
  hash: string;
}

interface NodeError extends Error {
  code?: string;
}

const isNodeError = (error: unknown): error is NodeError => {
  return error instanceof Error && 'code' in error;
};

const isValidUserData = (data: unknown): data is UserData => {
  const obj = data as Record<string, unknown>;
  return (
    typeof data === 'object' &&
    data !== null &&
    'login' in data &&
    'hash' in data &&
    typeof obj.login === 'string' &&
    typeof obj.hash === 'string'
  );
};

@Injectable()
export class AuthService {
  private readonly userFilePath = path.join(process.cwd(), 'user.json');

  constructor(private jwtService: JwtService) {}

  async register(registerDto: RegisterDto): Promise<MessageResponseDto> {
    try {
      await fs.access(this.userFilePath);
      throw new ConflictException('User already registered');
    } catch (error) {
      if (!isNodeError(error) || error.code !== 'ENOENT') {
        throw error;
      }
    }

    const hash = await argon2.hash(registerDto.password);
    const userData: UserData = { login: registerDto.login, hash };

    await fs.writeFile(this.userFilePath, JSON.stringify(userData, null, 2));
    return { message: 'User registered successfully' };
  }

  async login(loginDto: LoginDto): Promise<TokenResponseDto> {
    let parsedData: unknown;

    try {
      const fileContent = await fs.readFile(this.userFilePath, 'utf8');
      parsedData = JSON.parse(fileContent);
    } catch {
      throw new UnauthorizedException('User not found');
    }

    if (!isValidUserData(parsedData)) {
      throw new UnauthorizedException('Invalid user data structure');
    }

    const userData: UserData = parsedData;

    if (userData.login !== loginDto.login) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(
      userData.hash,
      loginDto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: loginDto.login };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
