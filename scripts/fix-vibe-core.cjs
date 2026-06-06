const fs = require("fs");
const path = require("path");

const pkgPath = path.resolve(process.cwd(), "node_modules/@vibe/core/package.json");
const distDir = path.resolve(process.cwd(), "node_modules/@vibe/core/dist");

if (!fs.existsSync(pkgPath)) {
  console.log("@vibe/core not found, skipping patch");
  process.exit(0);
}

let changed = false;
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

function collectFiles(dir, exclude) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (exclude && entry.name === exclude) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(full, exclude));
    } else {
      results.push(full);
    }
  }
  return results;
}

function findBestMatch(basename, searchDir, exclude, declaredRel) {
  const files = collectFiles(searchDir, exclude);
  const candidates = files.filter((f) => path.basename(f) === basename);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const declaredParts = declaredRel.replace(/\\/g, "/").split("/").slice(0, -1);

  let best = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const rel = path.relative(searchDir, c).replace(/\\/g, "/");
    const parts = rel.split("/").slice(0, -1);
    let score = 0;
    // Reward matching trailing directory components
    for (let i = 0; i < Math.min(declaredParts.length, parts.length); i++) {
      if (declaredParts[declaredParts.length - 1 - i] === parts[parts.length - 1 - i]) {
        score += 10;
      }
    }
    // Prefer shorter paths (closer to search root)
    score -= parts.length;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

function fixExportPath(declared, exportKey, declaredRel) {
  if (typeof declared !== "string") return declared;
  const m = declared.match(/^\.\/dist\/(.+)$/);
  if (!m) return declared;
  const sub = m[1];

  const fullPath = path.join(distDir, sub);
  if (fs.existsSync(fullPath)) return declared;

  const basename = path.basename(sub);
  const rel = declaredRel || sub;

  let actual;
  if (exportKey === "./mockedClassNames") {
    actual = findBestMatch(basename, path.join(distDir, "mocked_classnames"), null, rel);
  } else {
    actual = findBestMatch(basename, distDir, "mocked_classnames", rel);
  }

  if (actual) {
    const actualRel = path.relative(distDir, actual).replace(/\\/g, "/");
    changed = true;
    return "./dist/" + actualRel;
  }
  return declared;
}

if (pkg.main) {
  const mainRel = pkg.main.replace(/^dist\//, "");
  if (!fs.existsSync(path.join(distDir, mainRel))) {
    const actual = findBestMatch(path.basename(mainRel), distDir, "mocked_classnames", mainRel);
    if (actual) {
      const rel = path.relative(distDir, actual).replace(/\\/g, "/");
      pkg.main = "dist/" + rel;
      changed = true;
    }
  }
}

if (pkg.exports) {
  for (const key of Object.keys(pkg.exports)) {
    const val = pkg.exports[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      for (const subKey of Object.keys(val)) {
        if (typeof val[subKey] === "string") {
          const fixed = fixExportPath(val[subKey], key, val[subKey]);
          if (fixed !== val[subKey]) {
            val[subKey] = fixed;
            changed = true;
          }
        }
      }
    }
  }
}

if (changed) {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log("Fixed @vibe/core package.json paths to match dist layout");
} else {
  console.log("@vibe/core package.json paths are correct");
}
