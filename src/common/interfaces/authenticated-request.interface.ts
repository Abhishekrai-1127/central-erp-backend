import { Request } from 'express';
import { UserRole } from '../enums/user-role.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  organizationId?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
