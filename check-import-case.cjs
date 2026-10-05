const fs = require("fs");
const path = require("path");

const root = path.resolve("frontend");
const ignored = new Set(["node_modules", ".next"]);

function getFiles(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...getFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) result.push(full);
  }
  return result;
}

function actualPathCase(p) {
  const parts = path.resolve(p).split(path.sep);
  let current = parts[0] + path.sep;

  for (let i = 1; i < parts.length; i++) {
    if (!fs.existsSync(current)) return null;

    const wanted = parts[i];
    const match = fs.readdirSync(current).find(
      x => x.toLowerCase() === wanted.toLowerCase()
    );

    if (!match) return null;
    current = path.join(current, match);
  }

  return current;
}

function resolveImport(fromFile, spec) {
  let base;

  if (spec.startsWith("@/")) {
    base = path.join(root, spec.slice(2));
  } else if (spec.startsWith(".")) {
    base = path.resolve(path.dirname(fromFile), spec);
  } else {
    return null;
  }

  const candidates = [
    base,
    base + ".ts",
    base + ".tsx",
    base + ".js",
    base + ".jsx",
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];

  for (const candidate of candidates) {
    const actual = actualPathCase(candidate);
    if (actual && fs.existsSync(actual)) {
      return { candidate, actual };
    }
  }

  return null;
}

const files = getFiles(root);
const problems = [];

const importRegex =
  /(?:from\s*|import\s*\(\s*)["']([^"']+)["']/g;

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  let match;

  while ((match = importRegex.exec(source))) {
    const spec = match[1];
    const resolved = resolveImport(file, spec);

    if (!resolved) continue;

    const expected = path.normalize(resolved.candidate);
    const actual = path.normalize(resolved.actual);

    if (expected !== actual) {
      problems.push({
        file: path.relative(process.cwd(), file),
        import: spec,
        actual: path.relative(process.cwd(), actual),
      });
    }
  }
}

console.log(`Case-sensitive import mismatches found: ${problems.length}`);

for (const p of problems) {
  console.log(`\n${p.file}`);
  console.log(`  import: ${p.import}`);
  console.log(`  actual: ${p.actual}`);
}
