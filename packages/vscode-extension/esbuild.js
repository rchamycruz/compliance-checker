const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  external: ['vscode'],   // vscode es provisto por VS Code — nunca bundlear
  format: 'cjs',
  platform: 'node',
  target: 'node16',
  sourcemap: false,
  minify: false,
}).catch(() => process.exit(1));
