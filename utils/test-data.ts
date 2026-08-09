export type Role = 'admin' | 'professor' | 'student';

export interface SeedUser {
  username: string;
  password: string;
  role: Role;
}

/**
 * One representative account per role. Used by tests/auth.setup.ts to
 * generate the storageState each role-scoped project depends on, and as
 * the default actor in most specs.
 */
export const primaryUsers: Record<Role, SeedUser> = {
  admin: { username: 'admin', password: 'password', role: 'admin' },
  professor: { username: 'mkrmpotic', password: 'password', role: 'professor' },
  student: { username: 'sivanovic', password: 'password', role: 'student' },
};

/**
 * Full seeded roster (uni_course_management's src/main/resources/data.sql),
 * for tests needing a second account of a role — e.g. permission-boundary
 * checks ("professor B can't grade professor A's course") or data-driven
 * suites over multiple users. lkrmpotic/jpetrovic deliberately own no
 * courses (an empty-state case worth testing against).
 */
export const allUsers: SeedUser[] = [
  primaryUsers.admin,
  primaryUsers.professor,
  { username: 'aradovan', password: 'password', role: 'professor' },
  { username: 'iobad', password: 'password', role: 'professor' },
  { username: 'lkrmpotic', password: 'password', role: 'professor' },
  { username: 'jpetrovic', password: 'password', role: 'professor' },
  primaryUsers.student,
  { username: 'dmarinkovic', password: 'password', role: 'student' },
  { username: 'lpetrovic', password: 'password', role: 'student' },
  { username: 'mstojanovic', password: 'password', role: 'student' },
  { username: 'njakovljevic', password: 'password', role: 'student' },
  { username: 'tmitrovic', password: 'password', role: 'student' },
  { username: 'mgalic', password: 'password', role: 'student' },
];
