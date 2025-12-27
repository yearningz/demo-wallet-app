// Polyfill for Node < 20: Array.prototype.toReversed
// Metro (and its config loader) uses Array#toReversed in Node runtime.
// On Node 18 this method doesn't exist, causing "configs.toReversed is not a function".
// Define a minimal spec-compliant fallback before requiring metro-config.
if (!Array.prototype.toReversed) {
  Object.defineProperty(Array.prototype, 'toReversed', {
    value: function toReversed() {
      return Array.from(this).reverse();
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

const { getDefaultConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    sourceExts: process.env.RN_SRC_EXT
      ? process.env.RN_SRC_EXT.split(',').concat(['svg'])
      : ['js', 'json', 'ts', 'tsx', 'svg'],
  },
};

const defaultConfig = getDefaultConfig(__dirname);
module.exports = {
  ...defaultConfig,
  ...config,
  resolver: {
    ...defaultConfig.resolver,
    ...config.resolver,
  },
};
