export default {
  testEnvironment: 'jest-environment-jsdom',
  // Build output only. game/ is deliberately NOT ignored: its pure modules
  // (layout, elements) are unit tested. The two package.json files used to
  // collide in jest-haste-map, which is why the game's is named txokas-game.
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/public/game/'],
  setupFilesAfterEnv: ['@testing-library/jest-dom', '<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
    '^.+\\.css$': 'jest-transform-stub',
  },
  moduleNameMapper: {
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js',
  },
};
