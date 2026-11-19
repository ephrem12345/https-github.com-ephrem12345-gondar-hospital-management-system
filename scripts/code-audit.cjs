const fs = require('fs');
const path = require('path');

function getAllFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.next', 'dist', '.git', 'coverage', '.system_generated'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(fullPath, extensions));
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  return files;
}

const allFiles = getAllFiles('.');
console.log('Total source files found:', allFiles.length);

// 1. Check for console.log / console.error in non-test, non-script files
const consoleOccurrences = [];
for (const file of allFiles) {
  const relPath = path.relative('.', file).replace(/\\/g, '/');
  if (relPath.includes('test') || relPath.startsWith('scripts/') || relPath.startsWith('backend/scripts/') || relPath.startsWith('backend/prisma/seed')) continue;
  
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.match(/console\.(log|debug|info)\(/)) {
      consoleOccurrences.push({ file: relPath, line: index + 1, text: line.trim() });
    }
  });
}
console.log('\n--- Console.log in Production Code (' + consoleOccurrences.length + ') ---');
consoleOccurrences.forEach(c => console.log(`${c.file}:${c.line} -> ${c.text}`));

// 2. Identify duplicate exported type/interface names
const typeDefs = {};
for (const file of allFiles) {
  const relPath = path.relative('.', file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  const typeMatches = content.matchAll(/(?:export\s+)?(?:interface|type)\s+([A-Za-z0-9_]+)/g);
  for (const match of typeMatches) {
    const name = match[1];
    if (!typeDefs[name]) typeDefs[name] = [];
    typeDefs[name].push(relPath);
  }
}

const duplicateTypes = Object.entries(typeDefs).filter(([name, files]) => files.length > 1 && !['Props', 'State'].includes(name));
console.log('\n--- Duplicate Type/Interface Names (' + duplicateTypes.length + ') ---');
duplicateTypes.slice(0, 30).forEach(([name, files]) => {
  console.log(`${name} (${files.length} occurrences): ${files.join(', ')}`);
});

// 3. Identify duplicate function names
const funcDefs = {};
for (const file of allFiles) {
  const relPath = path.relative('.', file).replace(/\\/g, '/');
  if (relPath.includes('test.')) continue;
  const content = fs.readFileSync(file, 'utf8');
  const funcMatches = content.matchAll(/(?:export\s+)?(?:function|const)\s+([A-Za-z0-9_]+)\s*(?:=\s*(?:\([^)]*\)|async\s*\([^)]*\))\s*=>|\()/g);
  for (const match of funcMatches) {
    const name = match[1];
    if (['default', 'render', 'useEffect', 'useState', 'useCallback', 'useMemo', 'useRef', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(name)) continue;
    if (!funcDefs[name]) funcDefs[name] = [];
    funcDefs[name].push(relPath);
  }
}

const duplicateFuncs = Object.entries(funcDefs).filter(([name, files]) => files.length > 1);
console.log('\n--- Duplicate Function / Constant Names (' + duplicateFuncs.length + ') ---');
duplicateFuncs.slice(0, 30).forEach(([name, files]) => {
  console.log(`${name} (${files.length} occurrences): ${files.join(', ')}`);
});
