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
      this.loadedModules.set(sectionName, null); // Cache failure to avoid repeated attempts

      // Try to show error to user if helpers are available
      try {
        // Import showError dynamically if available (will be added by content.js)
        if (typeof showError === 'function') {
          showError(`Failed to load ${sectionName} section`, error.message);
        }
      } catch (e) {
        // showError not available yet, that's okay during initialization
      }

      return null;
    }
  },

  async fillSection(sectionName, config, helpers = {}) {
    try {
      const module = await this.load(sectionName);
      if (module && module.fill) {
        return await module.fill(config, helpers);
      }
      console.warn(`No fill handler for section: ${sectionName}`);
      return false;
    } catch (error) {
      console.error(`Failed to fill section ${sectionName}:`, error);
      if (helpers.showError) {
        helpers.showError(`Failed to fill ${sectionName}`, error.message);
      }
      return false;
    }
  }
};

// Export for content.js
if (typeof module !== 'undefined') {
  module.exports = { SectionLoader };
}
