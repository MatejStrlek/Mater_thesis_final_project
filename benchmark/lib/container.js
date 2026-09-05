/**
 * Shared target-app container control, used by every hypothesis's
 * measurement script that needs a clean, freshly-seeded app to run
 * against (H1, H2, and eventually H6). Centralized here so "restart and
 * wait for two consecutive 200s" is defined once, not copy-pasted per
 * script with a chance of drifting out of sync.
 */

const { execSync } = require('child_process');
const http = require('http');

const CONTAINER = 'uni-course-management';
const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';
const READY_TIMEOUT_MS = 90000;

function restartContainer() {
  execSync(`docker restart ${CONTAINER}`, { stdio: 'inherit' });
}

/**
 * Requires 2 *consecutive* 200s, not just one, before declaring the app
 * ready — a single successful poll right after `docker restart` can land
 * in a narrow window where the app is accepting connections but isn't
 * fully settled yet (the same race both suites' own CI workflows guard
 * against).
 */
function waitReady(timeoutMs = READY_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let consecutive = 0;
  return new Promise((resolve, reject) => {
    function check() {
      const req = http.get(`${BASE_URL}/login`, { timeout: 3000 }, (res) => {
        res.resume();
        if (res.statusCode === 200) {
          consecutive++;
          if (consecutive >= 2) return resolve();
        } else {
          consecutive = 0;
        }
        next();
      });
      req.on('error', () => {
        consecutive = 0;
        next();
      });
      req.on('timeout', () => {
        req.destroy();
        consecutive = 0;
        next();
      });
    }
    function next() {
      if (Date.now() > deadline) return reject(new Error('App did not become ready in time'));
      setTimeout(check, 2000);
    }
    check();
  });
}

module.exports = { restartContainer, waitReady, CONTAINER, BASE_URL };
