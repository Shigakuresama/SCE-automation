# Map View Feature - Manual Testing Notes

## Code Review Analysis - February 4, 2026

Since actual manual testing in Chrome is not possible in this environment, this document provides a comprehensive code review analysis identifying potential issues that should be tested during manual testing.

---

## Critical Issues Found

### 1. Map Container Height Visibility Issue
**Location:** `popup.html` line 431
**Issue:** The map container has a fixed height of 300px, but the container may not be visible when first loaded due to the `hidden` class.

```css
.map {
  width: 100%;
  height: 300px;
  background: #e0e0e0;
}
```

**Expected Behavior:** When clicking "Use Map View", the map should appear with proper dimensions.
**Actual Prediction:** The map may appear with 0 height if Leaflet initializes before the container is visible.

**Test:** Click "Use Map View" and verify the map is visible with correct dimensions. If not visible, may need to call `map.invalidateSize()` after showing the container.

**Recommendation:** Add a call to `invalidateSize()` in `route-planner.js` after showing the map container.

---

### 2. Leaflet Library Loading
**Location:** `popup.html` line 517
**Issue:** Leaflet is loaded at the end of the body. The module imports in `route-planner.js` may execute before Leaflet is available.

```html
<!-- Leaflet JS -->
<script src="lib/leaflet.js"></script>
<script src="popup.js"></script>
```

**Expected Behavior:** Map should initialize when the toggle is clicked.
**Actual Prediction:** May throw "Leaflet (L) is not loaded" error from `map-view.js:42`.

**Test:** Check browser console for errors when clicking "Use Map View". If error occurs, need to defer map initialization until after DOM fully loads.

---

### 3. Missing Address Object Field Mappings
**Location:** `route-planner.js:287-298`
**Issue:** Map-generated addresses may not include `street` field needed for PDF generation.

```javascript
return mapAddresses;
```

**Expected Behavior:** Addresses from map should have same structure as range-generated addresses.
**Actual Prediction:** PDF generation may fail with "undefined" street field.

**Test:** Select addresses via map, process them, and try generating PDF. Check if street field is present.

---

### 4. Map Mode State Not Properly Tracked
**Location:** `route-planner.js:178-226`
**Issue:** When toggling map mode, the `state.mapMode` is updated but form validation may not properly account for this state.

**Test:**
- Enable map mode
- Click "Use Address Range Instead" to disable map mode
- Verify the end address field becomes required again
- Try generating without end address - should show error

---

## High Priority Concerns

### 5. Nominatim API Rate Limiting
**Location:** `map-view.js:95-98`
**Issue:** No rate limiting on geocoding requests. Nominatim policy: 1 request/second.

**Expected Behavior:** Each click triggers a geocoding request.
**Actual Prediction:** Rapid clicking may result in rate limit errors (HTTP 429) or IP blocking.

**Test:** Click rapidly on multiple locations. Check for failed geocoding in console.

**Recommendation:** Implement debounce/throttle on map clicks (300-500ms).

---

### 6. Geocoding Error Handling
**Location:** `map-view.js:104-108`
**Issue:** Failed geocoding silently logs to console but doesn't inform user.

```javascript
if (!response.ok) {
  console.error('Geocoding failed:', response.status, response.statusText);
  return null;
}
```

**Expected Behavior:** User should see feedback when address can't be found.
**Actual Prediction:** Click appears to do nothing when geocoding fails.

**Test:** Click on ocean/areas without addresses. Verify no user feedback appears.

---

### 7. Missing `onMarkerRemove` Callback
**Location:** `route-planner.js:204-207`
**Issue:** `MapView` constructor receives `onMarkerRemove` option but this callback doesn't exist in `MapView` class.

```javascript
state.mapView = new MapView(mapElement, {
  onAddressSelect: (address) => { ... },
  onMarkerRemove: (address) => { ... },  // This callback doesn't exist!
});
```

**Expected Behavior:** Removing a marker should update UI.
**Actual Prediction:** This option is silently ignored - no error but may cause state desync.

---

### 8. Address Duplication Not Prevented
**Location:** `map-view.js`
**Issue:** No duplicate address detection. User can click same location multiple times.

**Expected Behavior:** Each click should add a unique address.
**Actual Prediction:** Duplicate addresses will be added to the list.

**Test:** Click the same location 3 times. Verify 3 identical addresses appear in list.

---

### 9. CSP (Content Security Policy) Concerns
**Location:** `manifest.json` line 20
**Issue:** Nominatim domain is in `host_permissions` but inline scripts in popup may violate CSP.

```json
"host_permissions": [
  "https://nominatim.openstreetmap.org/*"
]
```

**Expected Behavior:** Fetch requests to Nominatim should work.
**Actual Prediction:** May be blocked if CSP is restrictive.

**Test:** Click on map. Check network tab for Nominatim requests. If blocked, check CSP headers.

---

## Medium Priority Concerns

### 10. Map Tile Loading
**Location:** `map-view.js:49-53`
**Issue:** OpenStreetMap tiles are loaded from `tile.openstreetmap.org`. Requires internet.

**Test:** Test with network disabled. Verify map shows gray tiles with error.

---

### 11. State Name to Abbreviation Map Incomplete
**Location:** `map-view.js:140-147`
**Issue:** Only 50 US states mapped. International addresses or territories may fail.

**Test:** Not applicable for SCE use case (Southern California only).

---

### 12. Map Not Centered on User Location
**Location:** `map-view.js:7`
**Issue:** Default center is hardcoded to Orange County. No geolocation API use.

```javascript
const DEFAULT_CENTER = [33.8, -117.8]; // Orange County, SCE service area
```

**Expected Behavior:** Map centers on user's location or Orange County.
**Actual Prediction:** Always centers on Orange County (acceptable for use case).

---

### 13. Undo Button Disabled State
**Location:** `popup.html` line 403 and `map-view-ui.js:170`
**Issue:** Undo button starts disabled but may not re-enable properly after clearing.

**Test:**
1. Select 2 addresses
2. Click "Clear All"
3. Select 1 address
4. Verify undo button is enabled

---

### 14. Selected Count Not Updated When Marker Removed
**Location:** `map-view.js:228-236`
**Issue:** `removeMarker()` in MapView doesn't notify MapViewUI of changes.

**Expected Behavior:** Removing a marker via popup "Remove" button should update count.
**Actual Prediction:** Count may not sync with actual markers.

---

## Low Priority / Nice to Have

### 15. No Loading Indicator During Geocoding
**Location:** `map-view.js:79-92`
**Issue:** No visual feedback while waiting for geocoding response.

**Test:** Click on map - watch for spinner/loading state (none currently implemented).

---

### 16. Map Zoom Level
**Location:** `map-view.js:8`
**Issue:** Default zoom of 14 may be too close/far depending on use case.

**Test:** Verify zoom level is appropriate for selecting houses on a street.

---

### 17. Marker Popup Remove Button
**Location:** `map-view.js:192-217`
**Issue:** Popup remove button closes the popup when clicked, awkward UX.

**Test:** Click marker, click "Remove" button - popup closes instead of staying open.

---

### 18. Escape Key Not Handled
**Issue:** No keyboard shortcut to close map view.

**Test:** Press Escape while map is open - nothing happens (expected but not ideal).

---

## Test Execution Checklist

### Basic Flow Tests
- [ ] Extension loads without console errors
- [ ] "Route Planner" tab is accessible
- [ ] "Use Map View" button toggles map visibility
- [ ] Map displays with tiles (gray or colored)
- [ ] Click on map adds address to list
- [ ] Address count updates correctly
- [ ] Undo button removes last address
- [ ] Clear All removes all addresses
- [ ] Individual remove buttons work
- [ ] "Use Address Range Instead" hides map
- [ ] Form validation works in both modes

### Edge Cases
- [ ] Click on ocean/body of water (no address)
- [ ] Rapid clicking (rate limiting)
- [ ] Click same location multiple times (duplicates)
- [ ] Select address, toggle mode, select again (state preservation)
- [ ] Click map with no internet connection

### Processing Flow
- [ ] Map-generated addresses process correctly
- [ ] PDF generation works with map addresses
- [ ] Customer data capture works
- [ ] Progress bar updates correctly

### Network Tests
- [ ] Nominatim API requests visible in Network tab
- [ ] Map tiles load from tile.openstreetmap.org
- [ ] No CSP violations in console

---

## Test Results Summary

**Based on code review, the following tests are predicted to FAIL:**

1. **Map height issue** - Map may not render with proper height when toggled
2. **Duplicate addresses** - No prevention of duplicate address selection
3. **Geocoding feedback** - No user feedback when geocoding fails
4. **Rate limiting** - Rapid clicking will likely trigger Nominatim errors
5. **Marker/UI state sync** - Removing markers via popup may not update UI count

**Tests predicted to PASS:**

1. Basic map loading and display
2. Address selection from map clicks
3. Toggle between map mode and address range mode
4. Undo and Clear All functionality
5. Processing flow with map-selected addresses

---

## Recommendations for Fixes

### Priority 1 (Must Fix Before Release)
1. Add `invalidateSize()` call after showing map container
2. Implement duplicate address detection
3. Add user feedback for failed geocoding
4. Implement rate limiting/debouncing on map clicks

### Priority 2 (Should Fix)
1. Fix `onMarkerRemove` callback issue
2. Add loading indicator during geocoding
3. Ensure address objects have all required fields
4. Add network error handling

### Priority 3 (Nice to Have)
1. Keyboard shortcuts (Escape to close)
2. Improve marker popup UX
3. Geolocation for initial map center
4. Zoom controls

---

## Testing Environment Notes

- **Browser:** Chrome (latest)
- **Extension Location:** `/home/sergio/Projects/SCE/sce-extension/`
- **Load Method:** chrome://extensions/ → Load unpacked
- **Test Location:** Orange County, CA (in real testing)

---

## Additional Notes

The codebase is well-structured with good separation of concerns:
- `map-view.js` - Core Leaflet integration
- `map-view-ui.js` - UI state management
- `route-planner.js` - Feature integration

The unit tests pass (`map-view.test.js` all green), which is encouraging. However, the async nature of geocoding and browser-specific issues (CSP, DOM timing) may not be fully covered by unit tests.

**Action Item:** Manual testing in Chrome is strongly recommended to verify map rendering and geocoding functionality.
