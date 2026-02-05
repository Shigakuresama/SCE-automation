/**
 * SCE Automation Module
 * Queue processor for SCE form automation with postMessage communication
 */

const SCE_BASE_URL = 'https://sce.dsmcentral.com';
const SCE_LOGIN_URL = 'https://sce-trade-ally-community.my.site.com/tradeally/s/login/';
const BATCH_DELAY = 2000; // 2 seconds between addresses

export class SCEAutomation {
  constructor(options = {}) {
    this.queue = [];
    this.completed = [];
    this.isProcessing = false;
    this.onProgress = options.onProgress || null;
    this.onComplete = options.onComplete || null;
    this.onError = options.onError || null;
    this.batchSize = options.batchSize || 1;
  }

  /**
   * Start processing addresses
   * @param {Array<Object>} addresses - Addresses to process
   */
  async process(addresses) {
    this.queue = [...addresses];
    this.completed = [];
    this.isProcessing = true;

    while (this.queue.length > 0 && this.isProcessing) {
      const batch = this.queue.splice(0, this.batchSize);
      await this._processBatch(batch);

      if (this.queue.length > 0) {
        await this._delay(BATCH_DELAY);
      }
    }

    this.isProcessing = false;

    if (this.onComplete) {
      this.onComplete(this.completed);
    }
  }

  /**
   * Process a batch of addresses
   * @private
   */
  async _processBatch(batch) {
    for (const address of batch) {
      if (!this.isProcessing) break;

      try {
        const result = await this._processAddress(address);
        this.completed.push(result);

        if (this.onProgress) {
          this.onProgress({
            completed: this.completed.length,
            total: this.completed.length + this.queue.length,
            current: result
          });
        }
      } catch (error) {
        if (this.onError) {
          this.onError({
            address,
            error: error.message
          });
        }
      }
    }
  }

  /**
   * Process a single address
   * @private
   */
  async _processAddress(address) {
    return new Promise((resolve, reject) => {
      // Build SCE URL
      const sceUrl = this._buildSCEUrl(address);

      // Open SCE form in new tab
      const sceWindow = window.open(sceUrl, '_blank');

      if (!sceWindow) {
        reject(new Error('Failed to open SCE window (popup blocked?)'));
        return;
      }

      // Setup message handler
      const messageHandler = (event) => {
        const { type, data } = event.data;

        if (type === 'ADDRESS_COMPLETE') {
          window.removeEventListener('message', messageHandler);
          resolve(data);
        } else if (type === 'SCRIPT_ERROR') {
          window.removeEventListener('message', messageHandler);
          reject(new Error(data.message));
        }
      };

      window.addEventListener('message', messageHandler);

      // Send fill command to userscript
      setTimeout(() => {
        sceWindow.postMessage({
          type: 'FILL_FORM',
          data: address
        }, '*');
      }, 1000);

      // Timeout after 30 seconds
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        reject(new Error('Timeout waiting for SCE response'));
      }, 30000);
    });
  }

  /**
   * Build SCE application URL
   * @private
   */
  _buildSCEUrl(address) {
    // Open customer search directly - user should already be logged in via Trade Ally Community
    return 'https://sce.dsmcentral.com/onsite/customer-search';
  }

  /**
   * Delay between batches
   * @private
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Pause processing
   */
  pause() {
    this.isProcessing = false;
  }

  /**
   * Resume processing
   */
  resume() {
    if (!this.isProcessing && this.queue.length > 0) {
      this.isProcessing = true;
      this.process(this.queue);
    }
  }

  /**
   * Skip current address
   */
  skip() {
    if (this.queue.length > 0) {
      this.queue.shift();
    }
  }

  /**
   * Get progress
   */
  getProgress() {
    return {
      completed: this.completed.length,
      remaining: this.queue.length,
      total: this.completed.length + this.queue.length
    };
  }
}

export default SCEAutomation;
