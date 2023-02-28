import { defineConfig } from 'tsup';

export default defineConfig({
    clean: true,
    dts: true,
    entry: ['lib/index.ts'],
    format: ['cjs'],
    bundle: true,
    minify: true,
    skipNodeModulesBundle: true,
    target: 'es2020',
    keepNames: true,
});
