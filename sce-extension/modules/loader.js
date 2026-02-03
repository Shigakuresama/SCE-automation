// Module loader for lazy-loaded section handlers
const SectionLoader = {
  loadedModules: new Map(),

  async load(sectionName) {
    if (this.loadedModules.has(sectionName)) {
      return this.loadedModules.get(sectionName);
    }

    try {
      const moduleUrl = chrome.runtime.getURL(`sections/${sectionName}.js`);
      const module = await import(moduleUrl);
      this.loadedModules.set(sectionName, module);
      return module;
    } catch (error) {
      console.error(`Failed to load section ${sectionName}:`, error);
      return null;
    }
  },

  async fillSection(sectionName, config, helpers = {}) {
    const module = await this.load(sectionName);
    if (module && module.fill) {
      return module.fill(config, helpers);
    }
    console.warn(`No fill handler for section: ${sectionName}`);
    return false;
  }
};

// Export for content.js
if (typeof module !== 'undefined') {
  module.exports = { SectionLoader };
}
