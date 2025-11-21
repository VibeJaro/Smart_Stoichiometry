const fs = require('fs');
const path = require('path');

// Minimal async-aware test harness
const results = [];
const pending = [];

global.describe = (name, fn) => {
  fn();
};

global.it = (name, fn) => {
  const run = () => Promise.resolve().then(fn);
  const promise = run()
    .then(() => {
      results.push({ name, status: 'passed' });
    })
    .catch((error) => {
      results.push({ name, status: 'failed', error });
    });
  pending.push(promise);
};

async function run() {
  const testDir = __dirname;
  const files = fs.readdirSync(testDir).filter((file) => file.endsWith('.test.js'));
  files.forEach((file) => {
    require(path.join(testDir, file));
  });
  await Promise.allSettled(pending);
  const failed = results.filter((r) => r.status === 'failed');
  results.forEach((r) => {
    const prefix = r.status === 'passed' ? '✅' : '❌';
    console.log(`${prefix} ${r.name}`);
    if (r.error) {
      console.error(r.error);
    }
  });
  if (failed.length > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error('Test harness failed', error);
  process.exit(1);
});
