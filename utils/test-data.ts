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
  /** Linear Algebra — see courseId.math301; used by the API-level enroll/drop lifecycle test. */
  math301: 'MATH301',
  /**
   * Calculus I — owned by mkrmpotic, with its own 2 pre-seeded graded
   * enrollments (ids 3-4), separate from CS101's (ids 1-2). Deliberately
   * used by a different professor/grading.spec.ts test than CS101 — see
   * Phase 9's suite-health note in README.md for why sharing one course
   * between "reads a pre-seeded grade" and "grades away the first
   * available student" caused real, repeated failures this session.
   */
  math201: 'MATH201',
} as const;

/**
 * Numeric primary keys for the same seeded courses, needed by API-level
 * tests (the /api/enrollments endpoints take a courseId, not a code).
 * Per docs/API.md in the target app repo: "Ids are assigned in insertion
 * order starting at 1, so they're safe to hardcode ... as long as
 * data.sql isn't edited."
 */
export const courseId = {
  /** Linear Algebra — courses 12-15 have zero seeded enrollments, and no UI spec touches it either; kept clear for the API enroll/drop lifecycle test. */
  math301: 12,
  /** World History — primaryUsers.student's (sivanovic) enrollment here (enrollmentId.sivanovicHist101) is seeded ungraded; used by the grades-endpoint role-check test. */
  hist101: 5,
} as const;

/**
 * Seeded enrollment ids referenced by API-level tests. Per docs/API.md,
 * grades exist on enrollment ids 1-6 only — anything above that is
 * ungraded, so GradeService.assignGrade() treats a POST against it as a
 * fresh grade rather than an overwrite (though it upserts either way, so
 * this is safe to rerun regardless).
 */
export const enrollmentId = {
  /** primaryUsers.student (sivanovic) x HIST101 (courseId.hist101), seeded ungraded. */
  sivanovicHist101: 8,
} as const;
