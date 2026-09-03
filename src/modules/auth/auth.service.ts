import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { DatabaseService } from '../../core/database/database.service';
import { EmailService } from '../../core/email/email.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private getJwtSecret(): string {
    return (
      this.configService.get<string>('jwt.secret') ||
      process.env.JWT_SECRET ||
      'super-secret-erp-key'
    );
  }

  /* ---------------- REGISTER ---------------- */
  async register(registerDto: RegisterDto) {
    try {
      const { name, email, password, role, phone } = registerDto;

      const userRole = role || UserRole.SALES_REP;
      this.logger.log(`[register] Attempt: name=${name}, email=${email}, role=${userRole}`);

      if (!name || !email || !password) {
        this.logger.warn(`[register] Missing required fields`);
        throw new BadRequestException({ message: 'Name, email and password are required' });
      }

      // check if user exists
      const userExists = await this.db.query('SELECT id FROM users WHERE email = $1 AND is_deleted = false', [email]);
      if (userExists.rows.length > 0) {
        this.logger.warn(`[register] User already exists: ${email}`);
        throw new BadRequestException({ message: 'User already exists' });
      }

      // hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // insert user
      const result = await this.db.query(
        `INSERT INTO users (name, email, password_hash, role, phone, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, email, role, phone, status, created_at`,
        [name, email, hashedPassword, userRole, phone || null, UserStatus.ACTIVE],
      );

      this.logger.log(`[register] User registered: id=${result.rows[0].id}, email=${email}`);

      return {
        message: 'User registered successfully',
        user: result.rows[0],
      };
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`[register] Error: ${error.message}`, error.stack);
      throw new InternalServerErrorException({ message: 'Server error' });
    }
  }

  /* ---------------- LOGIN ---------------- */
  async login(loginDto: LoginDto) {
    try {
      const { email, password } = loginDto;

      this.logger.log(`[login] Attempt for email: ${email}`);

      if (!email || !password) {
        this.logger.warn(`[login] Missing email or password`);
        throw new BadRequestException({ message: 'Email and password required' });
      }

      const result = await this.db.query('SELECT * FROM users WHERE email = $1 AND is_deleted = false', [email]);

      if (result.rows.length === 0) {
        this.logger.warn(`[login] No user found with email: ${email}`);
        throw new BadRequestException({ message: 'Invalid credentials' });
      }

      const user = result.rows[0];

      if (user.status === UserStatus.INACTIVE) {
        this.logger.warn(`[login] Account inactive for email: ${email}`);
        throw new UnauthorizedException({ message: 'Account is inactive. Please contact system administrator.' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);

      if (!valid) {
        this.logger.warn(`[login] Wrong password for email: ${email}`);
        throw new BadRequestException({ message: 'Invalid credentials' });
      }

      // generate access token (short-lived)
      const accessToken = jwt.sign(
        { user_id: user.id, role: user.role, email: user.email },
        this.getJwtSecret(),
        { expiresIn: '1d' },
      );

      // generate refresh token (random, stored in DB)
      const refreshToken = crypto.randomBytes(40).toString('hex');

      await this.db.query(
        'INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2)',
        [user.id, refreshToken],
      );

      this.logger.log(`[login] Login successful for user_id=${user.id}, role=${user.role}`);

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          status: user.status,
          company_id: user.company_id,
        },
      };
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof UnauthorizedException) throw err;
      this.logger.error(`[login] Error: ${err.message}`, err.stack);
      throw new InternalServerErrorException({ message: 'Server error' });
    }
  }

  /* ---------------- ME ---------------- */
  async me(userId: string | number) {
    try {
      this.logger.log(`[me] Fetching profile for user_id=${userId}`);

      const result = await this.db.query(
        `SELECT id, name, email, role, phone, status, created_at
         FROM users
         WHERE id = $1 AND is_deleted = false`,
        [userId],
      );

      if (result.rows.length === 0) {
        this.logger.warn(`[me] User not found for user_id=${userId}`);
        throw new NotFoundException({ message: 'User not found' });
      }

      this.logger.log(`[me] Profile returned for user_id=${userId}`);

      return result.rows[0];
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`[me] Error: ${error.message}`, error.stack);
      throw new InternalServerErrorException({ message: 'Server error' });
    }
  }

  /* ---------------- REFRESH TOKEN ---------------- */
  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const { refreshToken } = refreshTokenDto;

      this.logger.log(`[refreshToken] Token refresh requested`);

      if (!refreshToken) {
        this.logger.warn(`[refreshToken] No refresh token provided`);
        throw new UnauthorizedException({ message: 'Token required' });
      }

      const result = await this.db.query('SELECT * FROM refresh_tokens WHERE token = $1', [
        refreshToken,
      ]);

      if (result.rows.length === 0) {
        this.logger.warn(`[refreshToken] Refresh token not found in DB`);
        throw new ForbiddenException({ message: 'Invalid refresh token' });
      }

      const userId = result.rows[0].user_id;

      this.logger.log(`[refreshToken] Token belongs to user_id=${userId}`);

      const user = await this.db.query('SELECT id, role, email FROM users WHERE id = $1 AND is_deleted = false', [userId]);

      if (user.rows.length === 0) {
        throw new UnauthorizedException({ message: 'User account no longer exists' });
      }

      const newAccessToken = jwt.sign(
        { user_id: user.rows[0].id, role: user.rows[0].role, email: user.rows[0].email },
        this.getJwtSecret(),
        { expiresIn: '1d' },
      );

      this.logger.log(`[refreshToken] New access token issued for user_id=${userId}`);

      return { accessToken: newAccessToken };
    } catch (err: any) {
      if (err instanceof UnauthorizedException || err instanceof ForbiddenException) throw err;
      this.logger.error(`[refreshToken] Error: ${err.message}`, err.stack);
      throw new InternalServerErrorException({ message: 'Server error' });
    }
  }

  /* ---------------- LOGOUT ---------------- */
  async logout(refreshTokenDto: RefreshTokenDto) {
    try {
      const { refreshToken } = refreshTokenDto;

      this.logger.log(`[logout] Logout requested`);

      if (!refreshToken) {
        this.logger.warn(`[logout] No refresh token provided, proceeding anyway`);
      }

      const del = await this.db.query('DELETE FROM refresh_tokens WHERE token = $1', [
        refreshToken,
      ]);

      this.logger.log(`[logout] Refresh token deleted (rows affected: ${del.rowCount})`);

      return { message: 'Logged out successfully' };
    } catch (err: any) {
      this.logger.error(`[logout] Error: ${err.message}`, err.stack);
      throw new InternalServerErrorException({ message: 'Server error' });
    }
  }

  /* ---------------- CHANGE PASSWORD ---------------- */
  async changePassword(userId: string | number, changePasswordDto: ChangePasswordDto) {
    try {
      const { currentPassword, newPassword } = changePasswordDto;

      this.logger.log(`[changePassword] Request for user_id=${userId}`);

      const user = await this.db.query('SELECT * FROM users WHERE id = $1 AND is_deleted = false', [userId]);

      if (user.rows.length === 0) {
        throw new NotFoundException({ message: 'User not found' });
      }

      const valid = await bcrypt.compare(currentPassword, user.rows[0].password_hash);

      if (!valid) {
        this.logger.warn(`[changePassword] Incorrect current password for user_id=${userId}`);
        throw new BadRequestException({ message: 'Current password incorrect' });
      }

      const hash = await bcrypt.hash(newPassword, 12);

      await this.db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);

      this.logger.log(`[changePassword] Password updated for user_id=${userId}`);

      return { message: 'Password updated' };
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) throw err;
      this.logger.error(`[changePassword] Error: ${err.message}`, err.stack);
      throw new InternalServerErrorException({ message: 'Server error' });
    }
  }

  /* ---------------- FORGOT PASSWORD ---------------- */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    try {
      const { email } = forgotPasswordDto;

      this.logger.log(`[forgotPassword] Request received for email: ${email}`);

      const user = await this.db.query('SELECT id FROM users WHERE email=$1 AND is_deleted = false', [email]);

      if (user.rows.length === 0) {
        this.logger.log(`[forgotPassword] Email not found in DB: ${email}`);
        return {
          message: 'If email exists, reset link sent',
        };
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 15 * 60 * 1000);

      await this.db.query(
        `INSERT INTO password_resets (user_id, token, expires_at)
         VALUES ($1, $2, $3)`,
        [user.rows[0].id, token, expires],
      );

      this.logger.log(`[forgotPassword] Reset token generated for user ID: ${user.rows[0].id}`);

      const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const resetLink = `${baseUrl}/reset-password?token=${token}`;

      const html = `
        <h3>Password Reset</h3>
        <p>Click the link below to reset your password</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link expires in 15 minutes.</p>
      `;

      this.logger.log(`[forgotPassword] Calling sendEmail...`);

      await this.emailService.sendEmail(email, 'Reset your password', html);

      this.logger.log(`[forgotPassword] sendEmail completed for: ${email}`);

      return {
        message: 'Reset email sent',
      };
    } catch (err: any) {
      this.logger.error(`[forgotPassword] Error: ${err.message}`, err.stack);
      throw new InternalServerErrorException({ message: 'Server error' });
    }
  }

  /* ---------------- RESET PASSWORD ---------------- */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      const { token, newPassword } = resetPasswordDto;

      const result = await this.db.query(
        `SELECT * FROM password_resets
         WHERE token=$1 AND expires_at > NOW()`,
        [token],
      );

      if (result.rows.length === 0) {
        throw new BadRequestException({ message: 'Invalid or expired token' });
      }

      const userId = result.rows[0].user_id;

      const hash = await bcrypt.hash(newPassword, 12);

      await this.db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, userId]);

      await this.db.query('DELETE FROM password_resets WHERE token=$1', [token]);

      return {
        message: 'Password reset successful',
      };
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`[resetPassword] Error: ${err.message}`, err.stack);
      throw new InternalServerErrorException({ message: 'Server error' });
    }
  }
}
