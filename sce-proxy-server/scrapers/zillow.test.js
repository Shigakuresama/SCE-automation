import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scrapeZillow } from './zillow.js';

describe('scrapeZillow', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('should return property data from HTML', async () => {
    const mockHtml = `
      <html>
        <script id="__NEXT_DATA__" type="application/json">
          {"props":{"pageProps":{"componentProps":{"gdpClientCache":{"Property:123": {"squareFootage": 1500, "yearBuilt": 2005}}}}}}
        </script>
      </html>
    `;

    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const result = await scrapeZillow('123 Main St', '12345');
    expect(result.squareFootage).toBe(1500);
    expect(result.yearBuilt).toBe(2005);
  });

  it('should return property data with livingArea field', async () => {
    const mockHtml = `
      <html>
        <script id="__NEXT_DATA__" type="application/json">
          {"props":{"pageProps":{"componentProps":{"gdpClientCache":{"Property:456": {"livingArea": 2000, "yearBuilt": 2010}}}}}}
        </script>
      </html>
    `;

    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const result = await scrapeZillow('456 Oak Ave', '67890');
    expect(result.squareFootage).toBe(2000);
    expect(result.yearBuilt).toBe(2010);
  });

  it('should throw ScrapingError when data not found', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html>No data here</html>')
    });

    await expect(scrapeZillow('123 Main St', '12345')).rejects.toThrow();
  });

  it('should throw ScrapingError on HTTP error', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 403
    });

    await expect(scrapeZillow('123 Main St', '12345')).rejects.toThrow('HTTP 403');
  });

  it('should handle nested property cache structure', async () => {
    const mockHtml = `
      <html>
        <script id="__NEXT_DATA__" type="application/json">
          {"props":{"pageProps":{"componentProps":{"gdpClientCache":{"Property": {"123": {"squareFootage": 1800, "yearBuilt": 2015}}}}}}}
        </script>
      </html>
    `;

    global.fetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const result = await scrapeZillow('789 Pine St', '54321');
    expect(result.squareFootage).toBe(1800);
    expect(result.yearBuilt).toBe(2015);
  });
});
