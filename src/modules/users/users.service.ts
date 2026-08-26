import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { UserQueryDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(query: UserQueryDto) {
    const { role, status, search, page = 1, limit = 20 } = query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Math.min(100, Number(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: string[] = ['is_deleted = false'];
    const params: any[] = [];

    if (role) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');

    // Total count query
    const countResult = await this.db.query(
      `SELECT COUNT(*)::int as total FROM users WHERE ${whereClause}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    // Data query
    params.push(limitNum);
    const limitParamIndex = params.length;
    params.push(offset);
    const offsetParamIndex = params.length;

    const result = await this.db.query(
      `SELECT id, name, email, role, phone, status, created_at, updated_at
       FROM users
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
      params,
    );

    return {
      data: result.rows,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: string) {
    const result = await this.db.query(
      `SELECT id, name, email, role, phone, status, created_at, updated_at
       FROM users
       WHERE id = $1 AND is_deleted = false`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException({ message: `User with ID ${id} not found` });
    }

    return result.rows[0];
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const existing = await this.findOne(id);

    const name = updateUserDto.name ?? existing.name;
    const email = updateUserDto.email ?? existing.email;
    const role = updateUserDto.role ?? existing.role;
    const phone = updateUserDto.phone ?? existing.phone;
    const status = updateUserDto.status ?? existing.status;

    const result = await this.db.query(
      `UPDATE users
       SET name = $1, email = $2, role = $3, phone = $4, status = $5, updated_at = NOW()
       WHERE id = $6 AND is_deleted = false
       RETURNING id, name, email, role, phone, status, created_at, updated_at`,
      [name, email, role, phone, status, id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException({ message: `User with ID ${id} not found` });
    }

    return {
      message: 'User details updated successfully',
      user: result.rows[0],
    };
  }
}
