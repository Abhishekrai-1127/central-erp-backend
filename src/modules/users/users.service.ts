import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  private users = [
    {
      id: '1',
      name: 'System Admin',
      email: 'admin@erp.com',
      role: UserRole.SUPER_ADMIN,
      createdAt: new Date().toISOString(),
    },
  ];

  async findAll(query: PaginationQueryDto) {
    return {
      items: this.users,
      total: this.users.length,
      page: query.page || 1,
      limit: query.limit || 10,
    };
  }

  async findOne(id: string) {
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }

  async create(createUserDto: CreateUserDto) {
    const newUser = {
      id: String(this.users.length + 1),
      name: createUserDto.name,
      email: createUserDto.email,
      role: createUserDto.role || UserRole.EMPLOYEE,
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    return newUser;
  }
}
