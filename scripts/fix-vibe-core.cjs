const fs = require("fs");
const path = require("path");

const pkgPath = path.resolve(process.cwd(), "node_modules/@vibe/core/package.json");

if (!fs.existsSync(pkgPath)) {
  console.log("⚠️  @vibe/core not found, skipping patch");
  process.exit(0);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
let changed = false;

const fixes = {
  main: "dist/index.js",
  "exports.": {
    "import": "./dist/index.js",
    "default": "./dist/index.js",
  },
  "exports./interactionsTests": {
    "import": "./dist/interactionsTests.js",
    "default": "./dist/interactionsTests.js",
  },
  "exports./testIds": {
    "import": "./dist/testIds.js",
    "default": "./dist/testIds.js",
  },
  "exports./next": {
    "import": "./dist/next.js",
    "default": "./dist/next.js",
  },
  "exports./mockedClassNames": {
    "import": "./dist/mocked_classnames/index.js",
    "default": "./dist/mocked_classnames/index.js",
  },
};

if (pkg.main === "dist/src/index.js") {
  pkg.main = "dist/index.js";
  changed = true;
}

if (pkg.exports?.["."]?.import === "./dist/src/index.js") {
  pkg.exports["."].import = "./dist/index.js";
  pkg.exports["."].default = "./dist/index.js";
  changed = true;
}

const exportFixes = {
  "./interactionsTests": ["./dist/src/tests/interactionsTests.js", "./dist/interactionsTests.js"],
  "./testIds": ["./dist/src/tests/testIds.js", "./dist/testIds.js"],
  "./next": ["./dist/src/components/next.js", "./dist/next.js"],
  "./mockedClassNames": ["./dist/mocked_classnames/src/index.js", "./dist/mocked_classnames/index.js"],
};

for (const [key, [oldPath, newPath]] of Object.entries(exportFixes)) {
  if (pkg.exports?.[key]?.import === oldPath) {
    pkg.exports[key].import = newPath;
    pkg.exports[key].default = newPath;
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log("✅ Fixed @vibe/core package.json paths");
} else {
  console.log("✓ @vibe/core package.json is correct, no changes needed");
}
