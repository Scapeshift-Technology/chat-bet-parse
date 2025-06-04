module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  extends: [
    'eslint:recommended'
  ],
  rules: {
    'no-unused-vars': 'off',
    'no-undef': 'off'
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    '*.js'
  ]
}; 