module.exports = {
  presets: [
    '@babel/preset-env',
    // `automatic` matches what Vite's React plugin does, so a component that
    // relies on the automatic JSX runtime (no `import React`) transforms the
    // same way under Jest as it does in the build. With the classic default,
    // such a file threw "React is not defined" only once a test touched it.
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
};
