// Script to build comprehensive actors and relationships data from the provided 80 actors dataset
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('src/data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Output directory prepared:', outDir);
