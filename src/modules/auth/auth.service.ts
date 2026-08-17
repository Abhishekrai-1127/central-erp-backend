import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto/login.dto';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class AuthService {
  async login(loginDto: LoginDto) {
    // Stub implementation - Replace with DB lookup & password validation
    if (loginDto.email === 'admin@erp.com' && loginDto.password === 'admin123') {
      return {
        accessToken: 'mock-jwt-access-token',
        user: {
          id: 'user-1',
          email: loginDto.email,
          role: UserRole.SUPER_ADMIN,
        },
      };
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async register(registerDto: RegisterDto) {
    // Stub implementation - Replace with DB user creation
    return {
      message: 'User registered successfully',
      user: {
        id: 'user-2',
        name: registerDto.name,
        email: registerDto.email,
        role: UserRole.EMPLOYEE,
      },
    };
  }
}
