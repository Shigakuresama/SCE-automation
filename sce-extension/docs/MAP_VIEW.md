# Map View Feature

## Overview

The Map View feature allows users to select addresses by clicking on an interactive map instead of manually entering address ranges.

## Usage

### Enabling Map View

1. Open the extension popup
2. Navigate to the "Route Planner" tab
3. Click the "🗺️ Use Map View - Click houses to add" button

### Selecting Addresses

1. The map will appear centered on Southern California (Orange County)
2. Navigate to your target area using mouse drag and scroll wheel
3. Click on houses/locations to add them to your route
4. The address will be reverse-geocoded and added to your list

### Managing Selected Addresses

- **Undo Last**: Removes the most recently added address
- **Clear All**: Removes all selected addresses
- **Remove Individual**: Click the ✕ button next to any address

### Processing

Click "Process Selected Addresses" to begin processing your selected houses. The button will be enabled when you have selected at least one address.

## Technical Details

- **Map Library**: Leaflet.js v1.9.4 (local files in lib/)
- **Geocoding**: Nominatim (OpenStreetMap) - free, no API key required
- **Rate Limiting**: Nominatim's usage policy is 1 request per second. The app does not enforce this limit, so please use responsibly and avoid rapid clicking to respect their service.

## Troubleshooting

- **Map doesn't appear**: Check that lib/leaflet.js and lib/leaflet.css exist in the sce-extension/lib/ directory
- **Geocoding fails**: Check your internet connection and Nominatim service availability
- **Addresses not appearing on map**: Ensure you have clicked on the map and the geocoding request completed successfully
- **Button remains disabled**: Make sure you have selected at least one address before trying to process
- **Duplicate addresses**: The system prevents duplicate addresses from being added. If you click the same location twice, it will only be added once
- **Map not responding to clicks**: Check browser console for JavaScript errors. Ensure Leaflet library loaded correctly
- **Incorrect address detected**: Nominatim reverse geocoding may not always find the exact address. You can manually edit addresses in the list before processing
