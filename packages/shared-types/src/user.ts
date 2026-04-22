import { EntityId, Timestamp } from './core';

/**
 * Usuario de la aplicación (Fase 3+)
 */
export interface User {
  id: EntityId;
  email: string;
  username: string;
  displayName?: string;
  avatar?: string;
  role: UserRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Roles de usuario
 */
export enum UserRole {
  USER = 'user',
  CREATOR = 'creator',
  PREMIUM = 'premium',
  ADMIN = 'admin',
}

/**
 * Sesión de usuario
 */
export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: Timestamp;
  user: User;
}
