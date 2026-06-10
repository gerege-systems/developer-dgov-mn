// gerege-backend-template-v27-ийн REST API-тай нийцсэн хуваалцсан типүүд.
// Эх сурвалж: docs/API_CONTRACT_MN.md болон responses.users.go.

/** Бүх backend хариу ороодог дугтуй (envelope). */
export interface Envelope<T = unknown> {
  status: boolean;
  message?: string;
  data?: T;
  request_id?: string;
}

/** responses.UserResponse — /login ба /refresh дээр токентой, /users/me дээр токенгүй. */
export interface BackendUser {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  first_name_en?: string;
  last_name_en?: string;
  full_name_en?: string;
  email: string;
  role_id: number;
  token?: string;
  refresh_token?: string;
  created_at: string;
  updated_at: string | null;
}

/** GET /users/me нь өгөгдлийг { user: ... } дотор савладаг. */
export interface MeData {
  user: BackendUser;
}

/** 422 validation алдааны үед data.errors талбар бүрээр ирнэ. */
export interface ValidationData {
  errors: Record<string, string>;
}

/** Frontend-д ашиглах цэвэрлэсэн хэрэглэгчийн дүрс. */
export interface SessionUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;     // монгол "Овог Нэр" (хоосон бол username)
  firstNameEn: string;
  lastNameEn: string;
  fullNameEn: string;   // англи "Lastname Firstname" (хоосон байж болно)
  email: string;
  roleId: number;
  createdAt: string;
  updatedAt: string | null;
}

/** Овог Нэр; хоосон бол username руу fallback. */
export function fullNameOf(u: { firstName?: string; lastName?: string; full_name?: string; username: string }): string {
  const composed = `${u.lastName ?? ''} ${u.firstName ?? ''}`.trim();
  return (u.full_name?.trim() || composed) || u.username;
}

/** Одоогийн хэлээр харуулах нэр: en үед англи нэр (байхгүй бол монгол/username). */
export function displayName(u: { fullName: string; fullNameEn?: string; username: string }, lang: 'mn' | 'en'): string {
  if (lang === 'en') return u.fullNameEn?.trim() || u.fullName || u.username;
  return u.fullName || u.username;
}

export function toSessionUser(u: BackendUser): SessionUser {
  const firstName = u.first_name ?? '';
  const lastName = u.last_name ?? '';
  const firstNameEn = u.first_name_en ?? '';
  const lastNameEn = u.last_name_en ?? '';
  return {
    id: u.id,
    username: u.username,
    firstName,
    lastName,
    fullName: fullNameOf({ firstName, lastName, full_name: u.full_name, username: u.username }),
    firstNameEn,
    lastNameEn,
    fullNameEn: (u.full_name_en?.trim() || `${lastNameEn} ${firstNameEn}`.trim()),
    email: u.email,
    roleId: u.role_id,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  };
}

/** role_id → хүний унших нэр. Backend-д 2 = энгийн хэрэглэгч. */
export function roleLabel(roleId: number, lang: 'mn' | 'en' = 'mn'): string {
  const mn: Record<number, string> = { 1: 'Админ', 2: 'Хэрэглэгч', 3: 'Менежер' };
  const en: Record<number, string> = { 1: 'Admin', 2: 'User', 3: 'Manager' };
  return (lang === 'en' ? en : mn)[roleId] ?? (lang === 'en' ? 'User' : 'Хэрэглэгч');
}
