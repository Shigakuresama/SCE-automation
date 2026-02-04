# SCE Route Planner Webapp

Standalone web application for planning canvassing routes with interactive map selection.

## Features

- **Map View Mode**: Click houses on interactive map or draw zones to select addresses
- **Address Range Mode**: Generate sequential addresses from a range
- **Address Search**: Find any address and center map on it
- **Zone Drawing**: Draw rectangles or circles to select multiple addresses
- **PDF Generation**: Export selected addresses as 3x3 grid PDF for canvassing

## Requirements

- Node.js 18+ (for proxy server)
- Python 3+ (for HTTP server, or use any web server)

## Setup

1. Start the proxy server:
   ```bash
   cd ../sce-proxy-server
   npm install
   npm start
   ```

2. Start the webapp:
   ```bash
   python3 -m http.server 8080
   ```

3. Open in browser:
   ```
   http://localhost:8080
   ```

## Usage

### Map View Mode

1. Click on the map to select individual houses
2. Or use "Draw Rectangle"/"Draw Circle" to select zones
3. Click "Undo" to remove last selection
4. Click "Clear" to start over
5. Click "Generate PDF" to export

### Address Range Mode

1. Enter start and end addresses (e.g., "1909 W Martha Ln" to "1925 W Martha Ln")
2. Enter city, state, ZIP
3. Select side (odd/even/both)
4. Optionally enter addresses to skip
5. Click "Generate Addresses"
6. Click "Generate PDF" to export

## Architecture

- **Leaflet.js**: Interactive maps
- **OpenStreetMap**: Map tiles
- **Nominatim API**: Geocoding (via proxy)
- **Overpass API**: Address data extraction (via proxy)
- **jsPDF**: PDF generation
- **localStorage**: Settings persistence
