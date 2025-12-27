// Minimal polyfill to support Metro on Node < 20
if (!Array.prototype.toReversed) {
  Object.defineProperty(Array.prototype, 'toReversed', {
    value: function toReversed() {
      return Array.prototype.slice.call(this).reverse();
    },
    writable: true,
    configurable: true,
    enumerable: false,
  });
}

