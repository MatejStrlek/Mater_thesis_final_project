export type Role = 'admin' | 'professor' | 'student';

export interface SeedUser {
  username: string;
  password: string;
  role: Role;
}

/** Every seeded account (data.sql) uses this same password. */
const SEED_PASSWORD = 'password';

/**
 * One representative account per role. Used by tests/auth.setup.ts to
 * generate the storageState each role-scoped project depends on, and as
 * the default actor in most specs.
 */
export const primaryUsers: Record<Role, SeedUser> = {
  admin: { username: 'admin', password: SEED_PASSWORD, role: 'admin' },
  professor: { username: 'mkrmpotic', password: SEED_PASSWORD, role: 'professor' },
  student: { username: 'sivanovic', password: SEED_PASSWORD, role: 'student' },
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
  { username: 'aradovan', password: SEED_PASSWORD, role: 'professor' },
  { username: 'iobad', password: SEED_PASSWORD, role: 'professor' },
  { username: 'lkrmpotic', password: SEED_PASSWORD, role: 'professor' },
  { username: 'jpetrovic', password: SEED_PASSWORD, role: 'professor' },
  primaryUsers.student,
  { username: 'dmarinkovic', password: SEED_PASSWORD, role: 'student' },
  { username: 'lpetrovic', password: SEED_PASSWORD, role: 'student' },
  { username: 'mstojanovic', password: SEED_PASSWORD, role: 'student' },
  { username: 'njakovljevic', password: SEED_PASSWORD, role: 'student' },
  { username: 'tmitrovic', password: SEED_PASSWORD, role: 'student' },
  { username: 'mgalic', password: SEED_PASSWORD, role: 'student' },
];

/**
 * Seeded course codes (data.sql) referenced by more than one spec, or
 * whose ownership/enrollment context matters to the test using them —
 * named here instead of as bare string literals so that context isn't
 * lost and the code isn't retyped at each use site.
 */
export const course = {
  /** Introduction to Computer Science — owned by mkrmpotic (primaryUsers.professor). */
  cs101: 'CS101',
  /** Owned by aradovan, not mkrmpotic — used to prove professor course-list scoping. */
  bio101: 'BIO101',
  /** Electromagnetism — not in primaryUsers.student's (sivanovic) existing enrollments; used for enroll/drop. */
  phy201: 'PHY201',
  /** Creative Writing — likewise not pre-enrolled; used for a second, independent enroll/drop test. */
  eng201: 'ENG201',
} as const;
