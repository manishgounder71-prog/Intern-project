// Headless browser globals polyfills for pdfjs-dist Node.js compatibility
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {
      this.a = 1;
      this.b = 0;
      this.c = 0;
      this.d = 1;
      this.e = 0;
      this.f = 0;
    }
  };
}

if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {};
}

if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = class Path2D {};
}
