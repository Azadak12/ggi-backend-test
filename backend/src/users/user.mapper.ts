import { User } from './user.entity';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  hasPassword: boolean;
  createdAt: Date;
}

export function toPublicUser(user: User): PublicUser {
  const { id, name, email, role, createdAt } = user;
  return {
    id,
    name,
    email,
    role,
    hasPassword: user.passwordHash !== null,
    createdAt,
  };
}
