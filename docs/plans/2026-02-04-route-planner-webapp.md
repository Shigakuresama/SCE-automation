# Route Planner Webapp Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the Chrome Extension Route Planner into a standalone webapp that runs on localhost with Leaflet.js maps, address search, zone drawing, and PDF generation.

**Architecture:** Single-page webapp with Leaflet.js for interactive maps, localStorage for settings persistence, fetch API for proxy server communication (geocoding/bounds search), and jsPDF for 3x3 grid PDF generation.

**Tech Stack:** HTML5, ES6 modules, Leaflet.js (CDN), jsPDF (CDN), Node.js/Express proxy server (existing), localStorage.

---

## Task 1: Create Webapp Directory Structure

**Files:**
- Create: `sce-webapp/`
- Create: `sce-webapp/index.html`
- Create: `sce-webapp/css/`
- Create: `sce-webapp/js/`
- Create: `sce-webapp/lib/`

**Step 1: Create directory structure**

```bash
cd /home/sergio/Projects/SCE
mkdir -p sce-webapp/css sce-webapp/js sce-webapp/lib
```

**Step 2: Verify directories created**

```bash
ls -la sce-webapp/
```

Expected: css/, js/, lib/ directories listed

**Step 3: No commit needed**

---

## Task 2: Create Main HTML File

**Files:**
- Create: `sce-webapp/index.html`

**Step 1: Write the HTML structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SCE Route Planner</title>
  <link rel="stylesheet" href="css/style.css">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
</head>
<body>
  <div class="app-container">
    <header class="app-header">
      <h1>🗺️ SCE Route Planner</h1>
    </header>

    <main class="app-main">
      <!-- Mode Selection -->
      <section class="mode-section">
        <div class="mode-tabs">
          <button class="mode-tab active" data-mode="map">📍 Map View</button>
          <button class="mode-tab" data-mode="range">🔢 Address Range</button>
        </div>
      </section>

      <!-- Map View Mode -->
      <section id="mapMode" class="mode-content active">
        <div class="map-controls">
          <div class="map-search">
            <input type="text" id="mapSearchInput" placeholder="Search address (e.g., 1909 W Martha Ln, Santa Ana, CA)">
            <button id="mapSearchBtn">🔍 Search</button>
          </div>
          <div class="map-draw-buttons">
            <button id="drawRectBtn" class="btn-secondary">▢ Draw Rectangle</button>
            <button id="drawCircleBtn" class="btn-secondary">○ Draw Circle</button>
            <button id="undoBtn" disabled>↩ Undo</button>
            <button id="clearBtn" disabled>🗑 Clear</button>
          </div>
        </div>
        <div id="map" class="map-container"></div>
        <div id="selectedAddresses" class="selected-addresses">
          <h3>Selected Addresses (<span id="selectedCount">0</span>)</h3>
          <div id="addressList" class="address-list"></div>
        </div>
      </section>

      <!-- Address Range Mode -->
      <section id="rangeMode" class="mode-content">
        <form id="addressRangeForm" class="address-form">
          <div class="form-row">
            <label>Start Address:</label>
            <input type="text" id="startAddress" placeholder="1909 W Martha Ln" required>
          </div>
          <div class="form-row">
            <label>End Address:</label>
            <input type="text" id="endAddress" placeholder="1925 W Martha Ln" required>
          </div>
          <div class="form-row">
            <label>City:</label>
            <input type="text" id="city" placeholder="Santa Ana" required>
          </div>
          <div class="form-row">
            <label>State:</label>
            <input type="text" id="state" placeholder="CA" required>
          </div>
          <div class="form-row">
            <label>ZIP Code:</label>
            <input type="text" id="zipCode" placeholder="92706" required>
          </div>
          <div class="form-row">
            <label>Side:</label>
            <select id="side">
              <option value="both">Both sides</option>
              <option value="odd">Odd only</option>
              <option value="even">Even only</option>
            </select>
          </div>
          <div class="form-row">
            <label>Skip Addresses (comma-separated):</label>
            <input type="text" id="skipAddresses" placeholder="1915, 1921">
          </div>
          <button type="submit" class="btn-primary">Generate Addresses</button>
        </form>
        <div id="generatedAddresses" class="generated-addresses hidden">
          <h3>Generated Addresses (<span id="generatedCount">0</span>)</h3>
          <div id="generatedList" class="address-list"></div>
        </div>
      </section>

      <!-- Route Summary -->
      <section id="routeSummary" class="route-summary hidden">
        <h2>📋 Route Summary</h2>
        <div class="summary-stats">
          <div class="stat">
            <span class="stat-label">Total Addresses:</span>
            <span class="stat-value" id="summaryTotal">0</span>
          </div>
          <div class="stat">
            <span class="stat-label">Area:</span>
            <span class="stat-value" id="summaryArea">-</span>
          </div>
        </div>
        <button id="generatePdfBtn" class="btn-primary">📄 Generate PDF</button>
      </section>
    </main>

    <div id="statusMessage" class="status-message hidden"></div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

**Step 2: No run step**

**Step 3: Commit**

```bash
cd /home/sergio/Projects/SCE
git add sce-webapp/index.html
git commit -m "feat: add main HTML structure for route planner webapp"
```

---

## Task 3: Create CSS Styles

**Files:**
- Create: `sce-webapp/css/style.css`

**Step 1: Write CSS styles**

```css
:root {
  --primary-color: #1976D2;
  --secondary-color: #424242;
  --success-color: #4CAF50;
  --error-color: #f44336;
  --warning-color: #ff9800;
  --border-color: #ddd;
  --bg-color: #f5f5f5;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-color);
  color: #333;
  line-height: 1.6;
}

.app-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.app-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.app-header h1 {
  color: var(--primary-color);
}

.mode-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.mode-tab {
  flex: 1;
  padding: 12px;
  border: 2px solid var(--border-color);
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.mode-tab:hover {
  border-color: var(--primary-color);
}

.mode-tab.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.mode-content {
  display: none;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.mode-content.active {
  display: block;
}

.map-controls {
  margin-bottom: 15px;
}

.map-search {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.map-search input {
  flex: 1;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.map-search button {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.map-draw-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.map-container {
  height: 500px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin-bottom: 15px;
}

.selected-addresses {
  margin-top: 15px;
}

.selected-addresses h3 {
  margin-bottom: 10px;
  color: var(--secondary-color);
}

.address-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 10px;
}

.address-item {
  padding: 8px;
  background: var(--bg-color);
  margin-bottom: 4px;
  border-radius: 4px;
  font-size: 13px;
}

.address-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-row label {
  font-weight: 500;
  color: var(--secondary-color);
}

.form-row input,
.form-row select {
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--success-color);
  color: white;
}

.btn-primary:hover {
  background: #45a049;
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--secondary-color);
  color: white;
}

.btn-secondary:hover {
  background: #616161;
}

.btn-secondary.active {
  background: var(--primary-color);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hidden {
  display: none !important;
}

.route-summary {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.route-summary h2 {
  margin-bottom: 15px;
  color: var(--primary-color);
}

.summary-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stat-label {
  font-size: 12px;
  color: var(--secondary-color);
  text-transform: uppercase;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: var(--primary-color);
}

.status-message {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  max-width: 300px;
  z-index: 1000;
}

.status-message.success {
  background: var(--success-color);
  color: white;
}

.status-message.error {
  background: var(--error-color);
  color: white;
}

.status-message.info {
  background: var(--primary-color);
  color: white;
}

.generated-addresses {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}
```

**Step 2: No run step**

**Step 3: Commit**

```bash
git add sce-webapp/css/style.css
git commit -m "feat: add CSS styles for route planner webapp"
```

---

## Task 4: Copy Address Generator Module

**Files:**
- Copy: `sce-extension/modules/address-generator.js` → `sce-webapp/js/address-generator.js`

**Step 1: Copy the file**

```bash
cp /home/sergio/Projects/SCE/sce-extension/modules/address-generator.js /home/sergio/Projects/SCE/sce-webapp/js/address-generator.js
```

**Step 2: Verify file copied**

```bash
ls -la sce-webapp/js/
```

Expected: address-generator.js listed

**Step 3: Commit**

```bash
git add sce-webapp/js/address-generator.js
git commit -m "feat: copy address generator module to webapp"
```

---

## Task 5: Create Storage Module

**Files:**
- Create: `sce-webapp/js/storage.js`

**Step 1: Write storage module**

```javascript
export const Storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Storage.get error for key "${key}":`, error);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Storage.set error for key "${key}":`, error);
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Storage.remove error for key "${key}":`, error);
    }
  },

  clear() {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Storage.clear error:', error);
    }
  }
};

export default Storage;
```

**Step 2: No run step**

**Step 3: Commit**

```bash
git add sce-webapp/js/storage.js
git commit -m "feat: add localStorage wrapper module"
```

---

## Task 6: Create MapView Module

**Files:**
- Create: `sce-webapp/js/map-view.js`

**Step 1: Write MapView module (use existing map-view.js as reference)**

```javascript
const PROXY_BASE_URL = 'http://localhost:3000';

export class MapView {
  constructor(container, options = {}) {
    this.container = container;
    this.proxyUrl = options.proxyUrl || PROXY_BASE_URL;

    this.map = L.map(container, {
      center: options.center || [33.8, -117.8],
      zoom: options.zoom || 14
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    }).addTo(this.map);

    this.markers = [];
    this.drawings = [];
    this.drawMode = null;
    this.drawState = {};

    this.onAddressSelect = null;
    this.onZoneSelect = null;

    this._setupMapEvents();
  }

  _setupMapEvents() {
    this.map.on('click', (e) => {
      if (!this.drawMode) {
        this._handleMapClick(e);
      }
    });
  }

  _handleMapClick(e) {
    const { lat, lng } = e.latlng;
    this.reverseGeocode(lat, lng)
      .then(address => {
        this.addMarker(lat, lng, address);
        if (this.onAddressSelect) {
          this.onAddressSelect({ lat, lng, ...address });
        }
      })
      .catch(error => {
        console.error('Reverse geocode failed:', error);
        this.addMarker(lat, lng, {
          display_name: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`
        });
      });
  }

  async searchAddress(query) {
    const url = `${this.proxyUrl}/api/geocode?q=${encodeURIComponent(query.trim())}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }
    const json = await response.json();
    return {
      lat: json.data.lat,
      lng: json.data.lon,
      display_name: json.data.display_name,
      address: json.data.address
    };
  }

  async goToAddress(query) {
    const result = await this.searchAddress(query);
    this.map.setView([result.lat, result.lng], 16);
    return result;
  }

  async reverseGeocode(lat, lon) {
    const url = `${this.proxyUrl}/api/reverse-geocode?lat=${lat}&lon=${lon}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.statusText}`);
    }
    const json = await response.json();
    return json.data;
  }

  addMarker(lat, lng, address = {}) {
    const marker = L.marker([lat, lng]).addTo(this.map);
    const popupContent = address.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    marker.bindPopup(popupContent).openPopup();
    this.markers.push({ marker, lat, lng, address });
    return marker;
  }

  enableRectangleDraw() {
    this.disableDrawMode();
    this.drawMode = 'rectangle';
    this.container.style.cursor = 'crosshair';
    this.drawState = { clicks: 0 };
    this.map.on('click', this._handleRectangleClick, this);
    this.map.on('mousemove', this._handleRectangleMove, this);
  }

  _handleRectangleClick(e) {
    if (this.drawMode !== 'rectangle') return;
    this.drawState.clicks++;
    if (this.drawState.clicks === 1) {
      this.drawState.startPoint = e.latlng;
      this.drawState.rectangle = L.rectangle(
        [[e.latlng.lat, e.latlng.lng], [e.latlng.lat, e.latlng.lng]],
        { color: '#1976D2', weight: 2 }
      ).addTo(this.map);
    } else if (this.drawState.clicks === 2) {
      this.disableDrawMode();
      const bounds = this.drawState.rectangle.getBounds();
      this._processZoneRectangle(bounds);
    }
  }

  _handleRectangleMove(e) {
    if (this.drawMode !== 'rectangle' || this.drawState.clicks !== 1) return;
    const start = this.drawState.startPoint;
    const bounds = [[start.lat, start.lng], [e.latlng.lat, e.latlng.lng]];
    this.drawState.rectangle.setBounds(bounds);
  }

  async _processZoneRectangle(bounds) {
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();
    try {
      const addresses = await this._extractAddressesInBounds({
        southWest: { lat: southWest.lat, lon: southWest.lng },
        northEast: { lat: northEast.lat, lon: northEast.lng }
      });
      if (this.onZoneSelect) {
        this.onZoneSelect(addresses);
      }
      addresses.forEach(addr => {
        if (addr.lat && addr.lon) {
          this.addMarker(addr.lat, addr.lon, addr);
        }
      });
    } catch (error) {
      console.error('Zone extraction failed:', error);
      this._showError(`Failed: ${error.message}`);
    }
  }

  async _extractAddressesInBounds(bounds) {
    const url = `${this.proxyUrl}/api/geocode/bounds`;
    const southWest = bounds.southWest;
    const northEast = bounds.northEast;
    const minLat = Math.min(southWest.lat, northEast.lat);
    const maxLat = Math.max(southWest.lat, northEast.lat);
    const minLon = Math.min(southWest.lon, northEast.lon);
    const maxLon = Math.max(southWest.lon, northEast.lon);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        southWest: { lat: minLat, lon: minLon },
        northEast: { lat: maxLat, lon: maxLon }
      }),
      signal: AbortSignal.timeout(60000)
    });
    if (!response.ok) {
      throw new Error(`Bounds search failed: ${response.statusText}`);
    }
    const json = await response.json();
    return json.data || [];
  }

  enableCircleDraw() {
    this.disableDrawMode();
    this.drawMode = 'circle';
    this.container.style.cursor = 'crosshair';
    this.drawState = { clicks: 0 };
    this.map.on('click', this._handleCircleClick, this);
    this.map.on('mousemove', this._handleCircleMove, this);
  }

  _handleCircleClick(e) {
    if (this.drawMode !== 'circle') return;
    this.drawState.clicks++;
    if (this.drawState.clicks === 1) {
      this.drawState.center = e.latlng;
      this.drawState.circle = L.circle(e.latlng, {
        radius: 0,
        color: '#1976D2',
        weight: 2
      }).addTo(this.map);
    } else if (this.drawState.clicks === 2) {
      this.disableDrawMode();
      const radius = this.drawState.center.distanceTo(e.latlng);
      this.drawState.circle.setRadius(radius);
      this._processZoneCircle(this.drawState.center, radius);
    }
  }

  _handleCircleMove(e) {
    if (this.drawMode !== 'circle' || this.drawState.clicks !== 1) return;
    const radius = this.drawState.center.distanceTo(e.latlng);
    this.drawState.circle.setRadius(radius);
  }

  async _processZoneCircle(center, radius) {
    const latDelta = (radius / 111000);
    const lonDelta = latDelta / Math.cos(center.lat * Math.PI / 180);
    const bounds = {
      southWest: { lat: center.lat - latDelta, lon: center.lng - lonDelta },
      northEast: { lat: center.lat + latDelta, lon: center.lng + lonDelta }
    };
    try {
      const addresses = await this._extractAddressesInBounds(bounds);
      if (this.onZoneSelect) {
        this.onZoneSelect(addresses);
      }
      addresses.forEach(addr => {
        if (addr.lat && addr.lon) {
          this.addMarker(addr.lat, addr.lon, addr);
        }
      });
    } catch (error) {
      console.error('Zone extraction failed:', error);
      this._showError(`Failed: ${error.message}`);
    }
  }

  disableDrawMode() {
    if (this.drawMode === 'rectangle') {
      this.map.off('click', this._handleRectangleClick, this);
      this.map.off('mousemove', this._handleRectangleMove, this);
    } else if (this.drawMode === 'circle') {
      this.map.off('click', this._handleCircleClick, this);
      this.map.off('mousemove', this._handleCircleMove, this);
    }
    this.drawMode = null;
    this.container.style.cursor = '';
    this.drawState = {};
  }

  isInDrawMode() {
    return this.drawMode !== null;
  }

  undoLastMarker() {
    if (this.markers.length === 0) return;
    const last = this.markers.pop();
    this.map.removeLayer(last.marker);
  }

  clearMarkers() {
    this.markers.forEach(({ marker }) => {
      this.map.removeLayer(marker);
    });
    this.markers = [];
  }

  clearDrawings() {
    this.drawings.forEach(drawing => {
      this.map.removeLayer(drawing);
    });
    this.drawings = [];
  }

  invalidateSize() {
    this.map.invalidateSize();
  }

  _showError(message) {
    window.dispatchEvent(new CustomEvent('mapError', { detail: message }));
  }

  getSelectedAddresses() {
    return this.markers.map(m => m.address);
  }
}

export default MapView;
```

**Step 2: No run step**

**Step 3: Commit**

```bash
git add sce-webapp/js/map-view.js
git commit -m "feat: add MapView module with Leaflet integration"
```

---

## Task 7: Create PDF Generator Module

**Files:**
- Create: `sce-webapp/js/pdf-generator.js`

**Step 1: Write PDF generator module**

```javascript
export class PDFGenerator {
  constructor() {
    this.jsPDF = window.jspdf.jsPDF;
  }

  async generateGrid(addresses) {
    const doc = new this.jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 10;
    const cols = 3;
    const rows = 3;
    const cellWidth = (pageWidth - 2 * margin) / cols;
    const cellHeight = (pageHeight - 2 * margin) / rows;

    const gridAddresses = addresses.slice(0, 9);

    gridAddresses.forEach((addr, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = margin + col * cellWidth;
      const y = margin + row * cellHeight;

      this._drawCell(doc, x, y, cellWidth, cellHeight, addr, index + 1);
    });

    return new Promise((resolve) => {
      doc.output('blob', (blob) => {
        resolve(blob);
      });
    });
  }

  _drawCell(doc, x, y, width, height, address, number) {
    const padding = 5;
    let currentY = y + padding;

    doc.rect(x, y, width, height);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${number}.`, x + padding, currentY);
    currentY += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(address.full || address.display_name || 'Unknown', width - 2 * padding);
    doc.text(lines, x + padding, currentY);
    currentY += lines.length * 4 + 4;

    doc.setFontSize(7);
    doc.text('Customer:', x + padding, currentY);
    currentY += 4;
    doc.setDrawColor(200);
    doc.line(x + padding, currentY, x + width - padding, currentY);
    currentY += 4;

    doc.text('Phone:', x + padding, currentY);
    currentY += 4;
    doc.line(x + padding, currentY, x + width - padding, currentY);
    currentY += 4;

    doc.text('Age:', x + padding, currentY);
    currentY += 4;
    doc.line(x + padding, currentY, x + width - padding, currentY);
    currentY += 4;

    doc.text('Notes:', x + padding, currentY);
    currentY += 4;

    const notesHeight = y + height - currentY - padding;
    const lineHeight = 3;
    for (let i = 0; i < Math.floor(notesHeight / lineHeight); i++) {
      doc.line(x + padding, currentY, x + width - padding, currentY);
      currentY += lineHeight;
    }

    const checkboxY = y + height - padding - 4;
    const checkboxWidth = 3;
    const checkboxGap = (width - 3 * checkboxWidth) / 4;

    const checkboxes = ['Qualified', 'Interested', 'Scheduled'];
    checkboxes.forEach((label, i) => {
      const cbX = x + checkboxGap + i * (checkboxWidth + checkboxGap);
      doc.rect(cbX, checkboxY, checkboxWidth, 3);
      doc.setFontSize(5);
      doc.text(label, cbX, checkboxY - 1);
    });
  }

  download(blob, filename = 'route-planner.pdf') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async generateAndDownload(addresses, filename = 'route-planner.pdf') {
    const blob = await this.generateGrid(addresses);
    this.download(blob, filename);
  }
}

export default PDFGenerator;
```

**Step 2: No run step**

**Step 3: Commit**

```bash
git add sce-webapp/js/pdf-generator.js
git commit -m "feat: add PDF generator module"
```

---

## Task 8: Create Main Application Module

**Files:**
- Create: `sce-webapp/js/app.js`

**Step 1: Write main app module**

```javascript
import { MapView } from './map-view.js';
import { PDFGenerator } from './pdf-generator.js';
import { generateAddressRange } from './address-generator.js';
import { Storage } from './storage.js';

const PROXY_URL = 'http://localhost:3000';

const state = {
  mode: 'map',
  mapView: null,
  selectedAddresses: [],
  generatedAddresses: []
};

const elements = {};

function init() {
  cacheElements();
  setupEventListeners();
  initMapView();
  loadSettings();
  console.log('Route Planner initialized');
}

function cacheElements() {
  elements.modeTabs = document.querySelectorAll('.mode-tab');
  elements.modeContents = document.querySelectorAll('.mode-content');
  elements.mapContainer = document.getElementById('map');
  elements.mapSearchInput = document.getElementById('mapSearchInput');
  elements.mapSearchBtn = document.getElementById('mapSearchBtn');
  elements.drawRectBtn = document.getElementById('drawRectBtn');
  elements.drawCircleBtn = document.getElementById('drawCircleBtn');
  elements.undoBtn = document.getElementById('undoBtn');
  elements.clearBtn = document.getElementById('clearBtn');
  elements.selectedCount = document.getElementById('selectedCount');
  elements.addressList = document.getElementById('addressList');
  elements.addressRangeForm = document.getElementById('addressRangeForm');
  elements.generatedAddresses = document.getElementById('generatedAddresses');
  elements.generatedCount = document.getElementById('generatedCount');
  elements.generatedList = document.getElementById('generatedList');
  elements.routeSummary = document.getElementById('routeSummary');
  elements.summaryTotal = document.getElementById('summaryTotal');
  elements.summaryArea = document.getElementById('summaryArea');
  elements.generatePdfBtn = document.getElementById('generatePdfBtn');
  elements.statusMessage = document.getElementById('statusMessage');
}

function setupEventListeners() {
  elements.modeTabs.forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });

  elements.mapSearchBtn.addEventListener('click', handleMapSearch);
  elements.mapSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleMapSearch();
  });

  elements.drawRectBtn.addEventListener('click', () => toggleDrawMode('rectangle'));
  elements.drawCircleBtn.addEventListener('click', () => toggleDrawMode('circle'));
  elements.undoBtn.addEventListener('click', handleUndo);
  elements.clearBtn.addEventListener('click', handleClear);

  elements.addressRangeForm.addEventListener('submit', handleGenerateRange);
  elements.generatePdfBtn.addEventListener('click', handleGeneratePDF);

  window.addEventListener('mapError', (e) => {
    showStatus(e.detail, 'error');
  });
}

function initMapView() {
  state.mapView = new MapView(elements.mapContainer, {
    center: [33.8, -117.8],
    zoom: 14,
    proxyUrl: PROXY_URL
  });

  state.mapView.onAddressSelect = (address) => {
    state.selectedAddresses.push(address);
    updateSelectedAddresses();
    showStatus(`Added: ${address.display_name || address.full}`, 'success');
  };

  state.mapView.onZoneSelect = (addresses) => {
    state.selectedAddresses = state.selectedAddresses.concat(addresses);
    updateSelectedAddresses();
    showStatus(`Found ${addresses.length} addresses in zone`, 'success');
  };

  setTimeout(() => {
    state.mapView.invalidateSize();
  }, 100);
}

function loadSettings() {
  const saved = Storage.get('routeplanner_settings', {});
  if (saved.city) document.getElementById('city').value = saved.city;
  if (saved.state) document.getElementById('state').value = saved.state;
  if (saved.zipCode) document.getElementById('zipCode').value = saved.zipCode;
}

function saveSettings() {
  const settings = {
    city: document.getElementById('city').value,
    state: document.getElementById('state').value,
    zipCode: document.getElementById('zipCode').value
  };
  Storage.set('routeplanner_settings', settings);
}

function switchMode(mode) {
  state.mode = mode;
  elements.modeTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });
  elements.modeContents.forEach(content => {
    content.classList.toggle('active', content.id === `${mode}Mode`);
  });
  if (mode === 'map') {
    setTimeout(() => {
      state.mapView.invalidateSize();
    }, 100);
  }
}

async function handleMapSearch() {
  const query = elements.mapSearchInput.value.trim();
  if (!query) {
    showStatus('Please enter an address', 'error');
    return;
  }

  elements.mapSearchBtn.disabled = true;
  elements.mapSearchBtn.textContent = 'Searching...';

  try {
    const result = await state.mapView.goToAddress(query);
    showStatus(`Found: ${result.display_name}`, 'success');
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    elements.mapSearchBtn.disabled = false;
    elements.mapSearchBtn.textContent = '🔍 Search';
  }
}

function toggleDrawMode(mode) {
  if (state.mapView.isInDrawMode() && state.mapView.drawMode === mode) {
    state.mapView.disableDrawMode();
    elements.drawRectBtn.classList.remove('active');
    elements.drawCircleBtn.classList.remove('active');
    showStatus('Draw mode disabled', 'info');
  } else {
    if (mode === 'rectangle') {
      state.mapView.enableRectangleDraw();
      elements.drawRectBtn.classList.add('active');
      elements.drawCircleBtn.classList.remove('active');
      showStatus('Click two corners to draw a rectangle', 'info');
    } else if (mode === 'circle') {
      state.mapView.enableCircleDraw();
      elements.drawCircleBtn.classList.add('active');
      elements.drawRectBtn.classList.remove('active');
      showStatus('Click center, then edge for radius', 'info');
    }
  }
}

function handleUndo() {
  if (state.selectedAddresses.length > 0) {
    state.selectedAddresses.pop();
    state.mapView.undoLastMarker();
    updateSelectedAddresses();
  }
}

function handleClear() {
  state.selectedAddresses = [];
  state.mapView.clearMarkers();
  state.mapView.clearDrawings();
  updateSelectedAddresses();
  showStatus('Cleared all addresses', 'info');
}

function updateSelectedAddresses() {
  elements.selectedCount.textContent = state.selectedAddresses.length;
  elements.undoBtn.disabled = state.selectedAddresses.length === 0;
  elements.clearBtn.disabled = state.selectedAddresses.length === 0;

  elements.addressList.innerHTML = '';

  if (state.selectedAddresses.length === 0) {
    const item = document.createElement('div');
    item.className = 'address-item';
    item.textContent = 'No addresses selected. Click on the map or draw a zone.';
    elements.addressList.appendChild(item);
  } else {
    state.selectedAddresses.forEach((addr, i) => {
      const item = document.createElement('div');
      item.className = 'address-item';
      item.textContent = `${i + 1}. ${addr.display_name || addr.full || 'Unknown'}`;
      elements.addressList.appendChild(item);
    });
  }

  updateRouteSummary();
}

function handleGenerateRange(e) {
  e.preventDefault();

  const startAddress = document.getElementById('startAddress').value.trim();
  const endAddress = document.getElementById('endAddress').value.trim();
  const city = document.getElementById('city').value.trim();
  const state = document.getElementById('state').value.trim();
  const zipCode = document.getElementById('zipCode').value.trim();
  const side = document.getElementById('side').value;
  const skipInput = document.getElementById('skipAddresses').value.trim();
  const skip = skipInput ? skipInput.split(',').map(s => parseInt(s.trim())) : [];

  try {
    const addresses = generateAddressRange(startAddress, endAddress, {
      city,
      state,
      zipCode,
      side,
      skip
    });

    state.generatedAddresses = addresses;

    elements.generatedCount.textContent = addresses.length;
    elements.generatedAddresses.classList.remove('hidden');

    elements.generatedList.innerHTML = '';
    addresses.forEach((addr, i) => {
      const item = document.createElement('div');
      item.className = 'address-item';
      item.textContent = `${i + 1}. ${addr.full}`;
      elements.generatedList.appendChild(item);
    });

    state.selectedAddresses = addresses.map(a => ({
      full: a.full,
      display_name: a.full,
      lat: null,
      lon: null
    }));

    updateSelectedAddresses();
    showStatus(`Generated ${addresses.length} addresses`, 'success');

    saveSettings();

  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  }
}

function updateRouteSummary() {
  const total = state.selectedAddresses.length;

  if (total > 0) {
    elements.summaryTotal.textContent = total;

    const firstAddr = state.selectedAddresses[0];
    elements.summaryArea.textContent = firstAddr.city || firstAddr.address?.city || 'Selected on map';

    elements.routeSummary.classList.remove('hidden');
  } else {
    elements.routeSummary.classList.add('hidden');
  }
}

async function handleGeneratePDF() {
  if (state.selectedAddresses.length === 0) {
    showStatus('No addresses to generate PDF for', 'error');
    return;
  }

  elements.generatePdfBtn.disabled = true;
  elements.generatePdfBtn.textContent = 'Generating...';

  try {
    const generator = new PDFGenerator();
    await generator.generateAndDownload(
      state.selectedAddresses,
      `route-planner-${new Date().toISOString().split('T')[0]}.pdf`
    );
    showStatus('PDF generated successfully', 'success');
  } catch (error) {
    showStatus(`Error generating PDF: ${error.message}`, 'error');
  } finally {
    elements.generatePdfBtn.disabled = false;
    elements.generatePdfBtn.textContent = '📄 Generate PDF';
  }
}

function showStatus(message, type = 'info') {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;
  elements.statusMessage.classList.remove('hidden');

  setTimeout(() => {
    elements.statusMessage.classList.add('hidden');
  }, 5000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { init };
```

**Step 2: No run step**

**Step 3: Commit**

```bash
git add sce-webapp/js/app.js
git commit -m "feat: add main application module"
```

---

## Task 9: Start HTTP Server and Verify

**Files:**
- Test: sce-webapp/

**Step 1: Start HTTP server**

```bash
cd /home/sergio/Projects/SCE/sce-webapp
python3 -m http.server 8080 > /tmp/http-server.log 2>&1 &
echo $!
```

Expected: PID number

**Step 2: Verify server running**

```bash
sleep 2 && curl -s http://localhost:8080 | head -20
```

Expected: HTML content from index.html

**Step 3: No commit**

---

## Task 10: Test with Chrome DevTools

**Files:**
- Test: All functionality

**Step 1: Navigate to webapp**

Navigate to `http://localhost:8080` using Chrome DevTools MCP

**Step 2: Test map search**

- Enter "1909 W Martha Ln, Santa Ana, CA" in search
- Click Search button
- Expected: Map centers on address

**Step 3: Test map click**

- Click on map
- Expected: Marker appears

**Step 4: No commit**

---

## Task 11: Create README

**Files:**
- Create: `sce-webapp/README.md`

**Step 1: Write README**

```markdown
# SCE Route Planner Webapp

Standalone web application for planning canvassing routes.

## Features

- Map View: Click houses or draw zones to select addresses
- Address Range: Generate sequential addresses
- Address Search: Find any address
- PDF Generation: Export as 3x3 grid

## Setup

1. Start proxy server:
   ```bash
   cd ../sce-proxy-server
   npm start
   ```

2. Start webapp:
   ```bash
   python3 -m http.server 8080
   ```

3. Open http://localhost:8080
```

**Step 2: Commit**

```bash
git add sce-webapp/README.md
git commit -m "docs: add README for route planner webapp"
```

---

## Task 12: Final Testing and Cleanup

**Files:**
- Test: All functionality

**Step 1: Run comprehensive tests**

Test all features and verify proxy running

**Step 2: Stop test server**

```bash
pkill -f "python3 -m http.server 8080"
```

**Step 3: Final commit**

```bash
git add sce-webapp/
git commit -m "feat: complete route planner webapp implementation"
```

---

**Plan Complete - 12 Tasks**
