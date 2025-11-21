const fs = require('fs');
const path = require('path');

// Minimal test harness
const results = [];

global.describe = (name, fn) => {
  fn();
};

global.it = (name, fn) => {
  try {
    fn();
    results.push({ name, status: 'passed' });
  } catch (error) {
    results.push({ name, status: 'failed', error });
  }
};

function run() {
  const testDir = __dirname;
  const files = fs.readdirSync(testDir).filter((file) => file.endsWith('.test.js'));
  files.forEach((file) => {
    require(path.join(testDir, file));
  });
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

run();
