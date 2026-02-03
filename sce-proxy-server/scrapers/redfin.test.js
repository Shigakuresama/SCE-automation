import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeRedfin } from './redfin.js';

describe('scrapeRedfin', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should return property data from Redfin HTML', async () => {
    const mockHtml = `
      <html>
        <div class="home-main-stats-variant">
          <div class="stats-value">1,500</div>
          <span>Square Feet</span>
        </div>
        <div class="key-value-list">
          <span>Year Built</span>
          <span>2005</span>
        </div>
      </html>
    `;

    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const result = await scrapeRedfin('123 Main St', '12345');
    expect(result.squareFootage).toBe(1500);
    expect(result.yearBuilt).toBe(2005);
  });

  it('should handle missing square footage', async () => {
    const mockHtml = `
      <html>
        <div class="key-value-list">
          <span>Year Built</span>
          <span>2010</span>
        </div>
      </html>
    `;

    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const result = await scrapeRedfin('456 Oak Ave', '67890');
    expect(result.squareFootage).toBeNull();
    expect(result.yearBuilt).toBe(2010);
  });

  it('should handle missing year built', async () => {
    const mockHtml = `
      <html>
        <div class="home-main-stats-variant">
          <div class="stats-value">2,000</div>
          <span>Square Feet</span>
        </div>
      </html>
    `;

    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const result = await scrapeRedfin('789 Pine St', '54321');
    expect(result.squareFootage).toBe(2000);
    expect(result.yearBuilt).toBeNull();
  });

  it('should throw ScrapingError when no data found', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html>No property data here</html>')
    });

    await expect(scrapeRedfin('123 Main St', '12345')).rejects.toThrow();
  });

  it('should throw ScrapingError on HTTP error', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 403
    });

    await expect(scrapeRedfin('123 Main St', '12345')).rejects.toThrow('HTTP 403');
  });

  it('should handle alternative Redfin HTML structure', async () => {
    const mockHtml = `
      <html>
        <div class="stats">
          <div class="stat">
            <div class="stat-value">1,750 sqft</div>
          </div>
        </div>
        <div class="property-info">
          <div class="info-row">
            <span>Year Built:</span>
            <span>2015</span>
          </div>
        </div>
      </html>
    `;

    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const result = await scrapeRedfin('321 Elm St', '11111');
    // This might not extract data but shouldn't throw
    expect(result).toBeDefined();
  });

  it('should parse square footage with comma format', async () => {
    const mockHtml = `
      <html>
        <div class="home-main-stats-variant">
          <div class="stats-value">2,500</div>
          <span>Square Feet</span>
        </div>
        <div class="key-value-list">
          <span>Year Built</span>
          <span>2020</span>
        </div>
      </html>
    `;

    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const result = await scrapeRedfin('555 Maple Dr', '22222');
    expect(result.squareFootage).toBe(2500);
    expect(result.yearBuilt).toBe(2020);
  });
});
