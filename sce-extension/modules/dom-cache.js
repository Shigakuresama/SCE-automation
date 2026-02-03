// DOM query caching utility
export class DomCache {
  constructor(sectionName) {
    this.section = sectionName;
    this.cache = new Map();
  }

  querySelector(selector) {
    const key = `${this.section}:${selector}`;

    if (!this.cache.has(key)) {
      const element = document.querySelector(selector);
      this.cache.set(key, element);
    }

    return this.cache.get(key);
  }

  querySelectorAll(selector) {
    const key = `${this.section}:${selector}:all`;

    if (!this.cache.has(key)) {
      const elements = document.querySelectorAll(selector);
      this.cache.set(key, elements);
    }

    return this.cache.get(key);
  }

  invalidate() {
    this.cache.clear();
  }

  invalidateSelector(selector) {
    const key = `${this.section}:${selector}`;
    const allKey = `${this.section}:${selector}:all`;
    this.cache.delete(key);
    this.cache.delete(allKey);
  }
}
