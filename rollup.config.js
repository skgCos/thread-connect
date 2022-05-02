import dts from 'rollup-plugin-dts'
import esbuild from 'rollup-plugin-esbuild'
import typescript from '@rollup/plugin-typescript';

const name = require('./package.json').main.replace(/\.js$/, '')

const bundle = config => ({
  ...config,
  input: 'src/lib/ThreadConnect.ts',
  external: id => !/^[./]/.test(id),
})

export default [
  // Library bundle
  bundle({
    plugins: [esbuild()],
    output: [
      {
        file: `${name}.js`,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: `${name}.mjs`,
        format: 'es',
        sourcemap: true,
      },
    ],
  }),
  bundle({
    plugins: [dts()],
    output: {
      file: `${name}.d.ts`,
      format: 'es',
    },
  }),

  // Browser test bundle
  {
    input: "src/test/browser/app.ts",
    output: {
        file: "test/browser/app.js",
        sourcemap: "inline",
        format: "iife"
    },
    plugins: [
        typescript({
            sourceMap: true,
            module: "esnext"
        })
    ]      
  },
  {
    input: "src/test/browser/testWorker.ts",
    output: {
        file: "test/browser/testWorker.js",
        sourcemap: "inline",
        format: "iife"
    },
    plugins: [
        typescript({
            sourceMap: true,
            module: "esnext"
        })
    ]      
  },

  // Electron test bundle
  {
    input: "src/test/electron/main.ts",
    output: {
        file: "test/electron/main.js",
        sourcemap: "inline",
        format: "commonjs"
    },
    plugins: [
        typescript({
            sourceMap: true,
            module: "esnext"
        })
    ]      
  },
  {
    input: "src/test/electron/preload.ts",
    output: {
        file: "test/electron/preload.js",
        sourcemap: "inline",
        format: "commonjs"
    },
    plugins: [
        typescript({
            sourceMap: true,
            module: "esnext"
        })
    ]      
  },
  {
    input: "src/test/electron/render.ts",
    output: {
        file: "test/electron/render.js",
        sourcemap: "inline",
        format: "es"
    },
    plugins: [
        typescript({
            sourceMap: true,
            module: "esnext"
        })
    ]      
  },

  // Node test bundle
  {
    input: "src/test/node/main.ts",
    output: {
        file: "test/node/main.js",
        sourcemap: "inline",
        format: "commonjs"
    },
    plugins: [
        typescript({
            sourceMap: true,
            module: "esnext"
        })
    ]      
  },
  {
    input: "src/test/node/worker.ts",
    output: {
        file: "test/node/worker.js",
        sourcemap: "inline",
        format: "commonjs"
    },
    plugins: [
        typescript({
            sourceMap: true,
            module: "esnext"
        })
    ]      
  },
  {
    input: "src/test/node/childProcess.ts",
    output: {
        file: "test/node/childProcess.js",
        sourcemap: "inline",
        format: "commonjs"
    },
    plugins: [
        typescript({
            sourceMap: true,
            module: "esnext"
        })
    ]      
  }
]