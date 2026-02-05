/**
 * SCE Route Planner Webapp - Main Application Module
 * Ties together all components: MapView, PDFGenerator, address generation, and storage
 */

import { MapView } from './map-view.js';
import { PDFGenerator } from './pdf-generator.js';
import { generateAddressRange, parseAddress } from './address-generator.js';
import { Storage } from './storage.js';
import { BlockDetector } from './block-detector.js';
import { PreviewModal } from './preview-modal.js';
import { RouteVisualizer } from './route-visualizer.js';
import { RouteList } from './route-list.js';
import { SCEAutomation } from './sce-automation.js';

class RoutePlannerApp {
  constructor() {
    // Application state
    this.state = {
      mode: 'map', // 'map', 'range', or 'block'
      mapView: null,
      selectedAddresses: [],
      generatedAddresses: [],
      drawMode: null, // 'rectangle' or 'circle'
      blockMode: false,
      currentBlock: null,
      blockDetector: null,
      previewModal: null,
      routeVisualizer: null,
      routeList: null,
      sceAutomation: null,
      capturedCustomerData: [], // Stores {address, customerName, phone, caseId}
      autoGeneratePDF: false // Flag to auto-generate PDF after processing
    };

    // PDF generator instance
    this.pdfGenerator = new PDFGenerator();

    // DOM elements cache
    this.elements = {};

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  /**
   * Initialize the application
   */
  init() {
    this.cacheElements();
    this.setupEventListeners();
    this.initMapView();
    this.loadSettings();
    this.setupSCEMessageListener();
    console.log('[App] SCE Route Planner initialized');
  }

  /**
   * Cache DOM element references
   */
  cacheElements() {
    // Mode tabs
    this.elements.modeTabs = document.querySelectorAll('.mode-tab');

    // Mode containers
    this.elements.mapMode = document.getElementById('mapMode');
    this.elements.rangeMode = document.getElementById('rangeMode');
    this.elements.blockRoutingMode = document.getElementById('blockRoutingMode');
    this.elements.routeSummary = document.getElementById('routeSummary');

    // Map controls
    this.elements.mapSearchInput = document.getElementById('mapSearchInput');
    this.elements.mapSearchBtn = document.getElementById('mapSearchBtn');
    this.elements.drawRectBtn = document.getElementById('drawRectBtn');
    this.elements.drawCircleBtn = document.getElementById('drawCircleBtn');
    this.elements.undoBtn = document.getElementById('undoBtn');
    this.elements.clearBtn = document.getElementById('clearBtn');
    this.elements.mapContainer = document.getElementById('map');

    // Address display
    this.elements.selectedCount = document.getElementById('selectedCount');
    this.elements.addressList = document.getElementById('addressList');
    this.elements.mapProcessBtn = document.getElementById('mapProcessBtn');
    this.elements.rangeProcessBtn = document.getElementById('rangeProcessBtn');

    // Range form
    this.elements.addressRangeForm = document.getElementById('addressRangeForm');
    this.elements.startAddress = document.getElementById('startAddress');
    this.elements.endAddress = document.getElementById('endAddress');
    this.elements.city = document.getElementById('city');
    this.elements.state = document.getElementById('state');
    this.elements.zipCode = document.getElementById('zipCode');
    this.elements.side = document.getElementById('side');
    this.elements.skipAddresses = document.getElementById('skipAddresses');

    // Generated addresses
    this.elements.generatedAddresses = document.getElementById('generatedAddresses');
    this.elements.generatedCount = document.getElementById('generatedCount');
    this.elements.generatedList = document.getElementById('generatedList');

    // Summary
    this.elements.summaryTotal = document.getElementById('summaryTotal');
    this.elements.summaryArea = document.getElementById('summaryArea');
    this.elements.generatePdfBtn = document.getElementById('generatePdfBtn');

    // Status message
    this.elements.statusMessage = document.getElementById('statusMessage');

    // Block routing elements
    this.elements.roundBlockBtn = document.getElementById('roundBlockBtn');
    this.elements.clearRouteBtn = document.getElementById('clearRouteBtn');
    this.elements.blockMap = document.getElementById('blockMap');
    this.elements.routeList = document.getElementById('routeList');
    this.elements.routeCount = document.getElementById('routeCount');
    this.elements.blockInfo = document.getElementById('blockInfo');
    this.elements.blockActions = document.getElementById('blockActions');
    this.elements.testOneBtn = document.getElementById('testOneBtn');
    this.elements.processAllBtn = document.getElementById('processAllBtn');
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Mode switching
    this.elements.modeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        this.switchMode(mode);
      });
    });

    // Map search
    this.elements.mapSearchBtn.addEventListener('click', () => this.handleMapSearch());
    this.elements.mapSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleMapSearch();
      }
    });

    // Draw mode buttons
    this.elements.drawRectBtn.addEventListener('click', () => this.toggleDrawMode('rectangle'));
    this.elements.drawCircleBtn.addEventListener('click', () => this.toggleDrawMode('circle'));

    // Undo and clear
    this.elements.undoBtn.addEventListener('click', () => this.handleUndo());
    this.elements.clearBtn.addEventListener('click', () => this.handleClear());

    // Map Process button
    if (this.elements.mapProcessBtn) {
      this.elements.mapProcessBtn.addEventListener('click', () => this.handleProcessAndGeneratePDF());
    }

    // Range Process button
    if (this.elements.rangeProcessBtn) {
      this.elements.rangeProcessBtn.addEventListener('click', () => this.handleProcessAndGeneratePDF());
    }

    // Address range form
    this.elements.addressRangeForm.addEventListener('submit', (e) => this.handleGenerateRange(e));

    // PDF generation
    this.elements.generatePdfBtn.addEventListener('click', () => this.handleGeneratePDF());

    // Map error events
    this.elements.mapContainer.addEventListener('mapError', (e) => {
      this.showStatus(e.detail.message, 'error');
    });

    // Block routing events
    if (this.elements.roundBlockBtn) {
      this.elements.roundBlockBtn.addEventListener('click', () => this.handleRoundBlock());
    }
    if (this.elements.clearRouteBtn) {
      this.elements.clearRouteBtn.addEventListener('click', () => this.handleClearRoute());
    }
    if (this.elements.testOneBtn) {
      this.elements.testOneBtn.addEventListener('click', () => this.handleTestOne());
    }
    if (this.elements.processAllBtn) {
      this.elements.processAllBtn.addEventListener('click', () => this.handleProcessAll());
    }
  }

  /**
   * Initialize the map view
   */
  initMapView() {
    try {
      // Load saved center/zoom or use defaults
      const savedSettings = Storage.get('mapSettings', {});
      const center = savedSettings.center || [33.8, -117.8];
      const zoom = savedSettings.zoom || 14;

      this.state.mapView = new MapView(this.elements.mapContainer, {
        center,
        zoom,
        proxyUrl: 'http://localhost:3000',
        onAddressSelect: (address) => this.handleAddressSelect(address),
        onZoneSelect: (addresses) => this.handleZoneSelect(addresses),
        onBlockDetect: (block) => this.handleBlockDetected(block)
      });

      console.log('[App] MapView initialized');
    } catch (error) {
      console.error('[App] Failed to initialize MapView:', error);
      this.showStatus('Failed to load map. Make sure Leaflet is loaded.', 'error');
    }
  }

  /**
   * Load settings from localStorage
   */
  loadSettings() {
    const settings = Storage.get('appSettings', {
      lastCity: 'Santa Ana',
      lastState: 'CA',
      lastZip: '92706',
      lastSide: 'both'
    });

    // Pre-fill form with saved values
    if (this.elements.city) {
      this.elements.city.value = settings.lastCity || '';
    }
    if (this.elements.state) {
      this.elements.state.value = settings.lastState || 'CA';
    }
    if (this.elements.zipCode) {
      this.elements.zipCode.value = settings.lastZip || '';
    }
    if (this.elements.side) {
      this.elements.side.value = settings.lastSide || 'both';
    }
  }

  /**
   * Save settings to localStorage
   */
  saveSettings() {
    const settings = {
      lastCity: this.elements.city?.value || '',
      lastState: this.elements.state?.value || 'CA',
      lastZip: this.elements.zipCode?.value || '',
      lastSide: this.elements.side?.value || 'both'
    };

    Storage.set('appSettings', settings);
  }

  /**
   * Setup message listener for SCE userscript communication
   */
  setupSCEMessageListener() {
    window.addEventListener('message', (event) => {
      const { type, data } = event.data;

      // Only process known message types
      if (!['ADDRESS_COMPLETE', 'SCRIPT_ERROR', 'SCRIPT_READY'].includes(type)) {
        return;
      }

      console.log('[App] Received message:', type, 'from:', event.origin, data);

      if (type === 'ADDRESS_COMPLETE') {
        this.handleAddressComplete(data);
      } else if (type === 'SCRIPT_ERROR') {
        this.handleSCEError(data);
      } else if (type === 'SCRIPT_READY') {
        console.log('[App] SCE userscript is ready');
      }
    });
  }

  /**
   * Handle address completion from SCE userscript
   */
  handleAddressComplete(data) {
    console.log('[App] Address complete:', data);

    // Store captured customer data
    this.state.capturedCustomerData.push({
      address: data.address,
      customerName: data.customerName || '',
      phone: data.phone || '',
      caseId: data.caseId || ''
    });

    // Show status
    this.showStatus(
      `Captured: ${data.address}${data.customerName ? ' - ' + data.customerName : ''}`,
      'success'
    );

    // Check if all addresses processed
    const totalToProcess = this.getActiveAddresses().length;
    if (this.state.capturedCustomerData.length >= totalToProcess) {
      this.showStatus('All addresses processed!', 'success');
      // Enable PDF generation
      this.elements.generatePdfBtn.disabled = false;

      // Auto-generate PDF if flag is set
      if (this.state.autoGeneratePDF) {
        this.state.autoGeneratePDF = false; // Reset flag
        setTimeout(() => this.handleGeneratePDF(), 500); // Small delay before generating
      }
    }
  }

  /**
   * Handle error from SCE userscript
   */
  handleSCEError(data) {
    console.error('[App] SCE error:', data);
    this.showStatus(`Error: ${data.message}`, 'error');
  }

  // ============================================
  // MODE SWITCHING
  // ============================================

  /**
   * Switch between map and range modes
   */
  switchMode(mode) {
    if (this.state.mode === mode) {
      return;
    }

    this.state.mode = mode;

    // Update tab UI
    this.elements.modeTabs.forEach(tab => {
      if (tab.dataset.mode === mode) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Show/hide mode containers
    if (mode === 'map') {
      this.elements.mapMode.classList.add('active');
      this.elements.rangeMode.classList.remove('active');

      // Invalidate map size after a delay to ensure container is visible
      setTimeout(() => {
        if (this.state.mapView) {
          this.state.mapView.invalidateSize();
        }
      }, 100);
    } else if (mode === 'range') {
      this.elements.mapMode.classList.remove('active');
      this.elements.rangeMode.classList.add('active');
    } else if (mode === 'block') {
      // Block mode - hide other modes, show block routing view
      this.elements.mapMode.classList.remove('active');
      this.elements.rangeMode.classList.remove('active');
      this.elements.blockRoutingMode.classList.add('active');
    }

    // Update route summary based on active mode
    this.updateRouteSummary();

    console.log(`[App] Switched to ${mode} mode`);
  }

  // ============================================
  // MAP SEARCH
  // ============================================

  /**
   * Handle map address search
   */
  async handleMapSearch() {
    const query = this.elements.mapSearchInput.value.trim();

    if (!query) {
      this.showStatus('Please enter an address to search', 'warning');
      return;
    }

    this.showStatus('Searching for address...', 'info');

    try {
      const result = await this.state.mapView.goToAddress(query);

      if (result) {
        this.showStatus(`Found: ${result.display_name || query}`, 'success');
      } else {
        this.showStatus('Address not found. Try a different format.', 'error');
      }
    } catch (error) {
      console.error('[App] Map search error:', error);
      this.showStatus('Search failed. Is the proxy server running?', 'error');
    }
  }

  // ============================================
  // DRAW MODE
  // ============================================

  /**
   * Toggle draw mode (rectangle/circle)
   */
  toggleDrawMode(mode) {
    const currentMode = this.state.mapView.getDrawMode();

    if (currentMode === mode) {
      // Disable current mode
      this.state.mapView.disableDrawMode();
      this.state.drawMode = null;
      this._updateDrawButtons();
      this.showStatus('Draw mode disabled', 'info');
      return;
    }

    // Enable new mode
    if (mode === 'rectangle') {
      this.state.mapView.enableRectangleDraw();
      this.state.drawMode = 'rectangle';
      this.showStatus('Rectangle draw mode: Click two corners to select area', 'info');
    } else if (mode === 'circle') {
      this.state.mapView.enableCircleDraw();
      this.state.drawMode = 'circle';
      this.showStatus('Circle draw mode: Click center, then edge to select area', 'info');
    }

    this._updateDrawButtons();
  }

  /**
   * Update draw button states
   */
  _updateDrawButtons() {
    const currentMode = this.state.mapView.getDrawMode();

    this.elements.drawRectBtn.classList.toggle('active', currentMode === 'rectangle');
    this.elements.drawCircleBtn.classList.toggle('active', currentMode === 'circle');
  }

  // ============================================
  // UNDO / CLEAR
  // ============================================

  /**
   * Handle undo button click
   */
  handleUndo() {
    this.state.mapView.undoLastMarker();
    this.state.selectedAddresses = this.state.mapView.getSelectedAddresses();
    this.updateSelectedAddresses();
    this._updateUndoClearButtons();

    // Update Process button state
    if (this.elements.mapProcessBtn) {
      this.elements.mapProcessBtn.disabled = this.state.selectedAddresses.length === 0;
    }
  }

  /**
   * Handle clear button click
   */
  handleClear() {
    this.state.mapView.clearMarkers();
    this.state.mapView.clearDrawings();
    this.state.selectedAddresses = [];
    this.updateSelectedAddresses();
    this._updateUndoClearButtons();

    // Disable Process button when no addresses
    if (this.elements.mapProcessBtn) {
      this.elements.mapProcessBtn.disabled = true;
    }

    this.showStatus('Cleared all selections', 'info');
  }

  /**
   * Update undo/clear button enabled states
   */
  _updateUndoClearButtons() {
    const hasSelections = this.state.selectedAddresses.length > 0;
    this.elements.undoBtn.disabled = !hasSelections;
    this.elements.clearBtn.disabled = !hasSelections;
  }

  // ============================================
  // ADDRESS SELECTION
  // ============================================

  /**
   * Handle single address selection from map click
   */
  handleAddressSelect(address) {
    this.state.selectedAddresses.push(address);
    this.updateSelectedAddresses();
    this._updateUndoClearButtons();
    this.updateRouteSummary();

    // Enable Process button when addresses are selected
    if (this.state.selectedAddresses.length > 0 && this.elements.mapProcessBtn) {
      this.elements.mapProcessBtn.disabled = false;
    }

    console.log('[App] Address selected:', address.full || address.display_name);
  }

  /**
   * Handle zone selection from drawing
   */
  handleZoneSelect(addresses) {
    // Add new addresses to selection
    for (const address of addresses) {
      // Avoid duplicates
      const exists = this.state.selectedAddresses.some(a =>
        (a.full || a.display_name) === (address.full || address.display_name)
      );

      if (!exists) {
        this.state.selectedAddresses.push(address);
      }
    }

    this.updateSelectedAddresses();
    this._updateUndoClearButtons();
    this.updateRouteSummary();

    // Enable Process button when addresses are selected
    if (this.state.selectedAddresses.length > 0 && this.elements.mapProcessBtn) {
      this.elements.mapProcessBtn.disabled = false;
    }

    this.showStatus(`Selected ${addresses.length} addresses from zone`, 'success');
  }

  /**
   * Update selected addresses display
   */
  updateSelectedAddresses() {
    const count = this.state.selectedAddresses.length;
    this.elements.selectedCount.textContent = count;

    // Clear and rebuild list
    this.elements.addressList.innerHTML = '';

    if (count === 0) {
      const empty = document.createElement('div');
      empty.className = 'address-empty';
      empty.textContent = 'Click on the map to select addresses';
      this.elements.addressList.appendChild(empty);
      return;
    }

    this.state.selectedAddresses.forEach((address, index) => {
      const item = document.createElement('div');
      item.className = 'address-item';

      const num = document.createElement('span');
      num.className = 'address-number';
      num.textContent = `${index + 1}.`;

      const text = document.createElement('span');
      text.className = 'address-text';
      text.textContent = address.full || address.display_name || 'Unknown';

      const remove = document.createElement('button');
      remove.className = 'address-remove';
      remove.textContent = '×';
      remove.title = 'Remove';
      remove.onclick = () => {
        this.state.mapView.removeMarker(index);
        this.state.selectedAddresses.splice(index, 1);
        this.updateSelectedAddresses();
        this._updateUndoClearButtons();
      };

      item.appendChild(num);
      item.appendChild(text);
      item.appendChild(remove);
      this.elements.addressList.appendChild(item);
    });
  }

  // ============================================
  // ADDRESS RANGE
  // ============================================

  /**
   * Handle address range form submission
   */
  handleGenerateRange(e) {
    e.preventDefault();

    const startAddress = this.elements.startAddress.value.trim();
    const endAddress = this.elements.endAddress.value.trim();
    const city = this.elements.city.value.trim();
    const state = this.elements.state.value.trim();
    const zipCode = this.elements.zipCode.value.trim();
    const side = this.elements.side.value;
    const skipInput = this.elements.skipAddresses.value.trim();

    // Build full addresses
    const fullStart = `${startAddress}, ${city}, ${state} ${zipCode}`;
    const fullEnd = `${endAddress}, ${city}, ${state} ${zipCode}`;

    // Parse skip addresses
    const skip = skipInput
      ? skipInput.split(',').map(s => s.trim()).filter(s => s)
      : [];

    try {
      // Save form values for next time
      this.saveSettings();

      // Generate addresses
      const addresses = generateAddressRange(fullStart, fullEnd, { side, skip });

      this.state.generatedAddresses = addresses;
      this.updateGeneratedAddresses();
      this.updateRouteSummary();

      // Enable Process button when addresses are generated
      if (this.state.generatedAddresses.length > 0 && this.elements.rangeProcessBtn) {
        this.elements.rangeProcessBtn.disabled = false;
      }

      this.showStatus(`Generated ${addresses.length} addresses`, 'success');

    } catch (error) {
      console.error('[App] Address generation error:', error);
      this.showStatus(error.message, 'error');
    }
  }

  /**
   * Update generated addresses display
   */
  updateGeneratedAddresses() {
    const count = this.state.generatedAddresses.length;
    this.elements.generatedCount.textContent = count;

    // Show the container
    this.elements.generatedAddresses.classList.remove('hidden');

    // Clear and rebuild list
    this.elements.generatedList.innerHTML = '';

    if (count === 0) {
      this.elements.generatedAddresses.classList.add('hidden');
      return;
    }

    this.state.generatedAddresses.forEach((address, index) => {
      const item = document.createElement('div');
      item.className = 'address-item';

      const num = document.createElement('span');
      num.className = 'address-number';
      num.textContent = `${index + 1}.`;

      const text = document.createElement('span');
      text.className = 'address-text';
      text.textContent = address.full || 'Unknown';

      item.appendChild(num);
      item.appendChild(text);
      this.elements.generatedList.appendChild(item);
    });
  }

  // ============================================
  // ROUTE SUMMARY
  // ============================================

  /**
   * Update route summary display
   */
  updateRouteSummary() {
    const addresses = this.getActiveAddresses();
    const count = addresses.length;

    if (count === 0) {
      this.elements.routeSummary.classList.add('hidden');
      return;
    }

    this.elements.routeSummary.classList.remove('hidden');
    this.elements.summaryTotal.textContent = count;

    // Determine area name
    let area = '-';
    if (this.state.mode === 'map') {
      area = 'Map Selection';
    } else {
      const firstAddr = this.state.generatedAddresses[0];
      if (firstAddr && firstAddr.city) {
        area = `${firstAddr.city}, ${firstAddr.state}`;
      }
    }
    this.elements.summaryArea.textContent = area;
  }

  /**
   * Get active addresses based on current mode
   */
  getActiveAddresses() {
    if (this.state.mode === 'map') {
      return this.state.selectedAddresses;
    } else {
      return this.state.generatedAddresses;
    }
  }

  // ============================================
  // PDF GENERATION
  // ============================================

  /**
   * Handle PDF generation button click
   */
  async handleGeneratePDF() {
    const addresses = this.getActiveAddresses();

    if (addresses.length === 0) {
      this.showStatus('No addresses to generate PDF for', 'warning');
      return;
    }

    this.showStatus('Generating PDF...', 'info');

    try {
      // Merge addresses with captured customer data
      const addressesWithData = addresses.map(addr => {
        const fullAddress = addr.full || addr;
        const captured = this.state.capturedCustomerData.find(
          c => c.address === fullAddress
        );

        return {
          address: fullAddress,
          customerName: captured?.customerName || '',
          phone: captured?.phone || '',
          caseId: captured?.caseId || ''
        };
      });

      // Generate filename with timestamp
      const date = new Date();
      const timestamp = date.toISOString().slice(0, 10);
      const filename = `sce-route-${timestamp}.pdf`;

      await this.pdfGenerator.generateAndDownload(addressesWithData, filename);

      this.showStatus('PDF downloaded successfully', 'success');
      console.log('[App] PDF generated:', filename);

    } catch (error) {
      console.error('[App] PDF generation error:', error);
      this.showStatus('Failed to generate PDF: ' + error.message, 'error');
    }
  }

  /**
   * Handle Process & Generate PDF button click
   * Process addresses through SCE forms and auto-generate PDF when complete
   */
  async handleProcessAndGeneratePDF() {
    const addresses = this.getActiveAddresses();

    if (addresses.length === 0) {
      this.showStatus('No addresses to process', 'warning');
      return;
    }

    console.log('[App] Processing and generating PDF for', addresses.length, 'addresses');

    // Set flag to auto-generate PDF after processing
    this.state.autoGeneratePDF = true;

    // Clear any previous captured data
    this.state.capturedCustomerData = [];

    // Disable buttons during processing
    if (this.elements.mapProcessBtn) {
      this.elements.mapProcessBtn.disabled = true;
    }
    if (this.elements.rangeProcessBtn) {
      this.elements.rangeProcessBtn.disabled = true;
    }
    this.elements.generatePdfBtn.disabled = true;

    // Initialize SCE automation if not already done
    if (!this.state.sceAutomation) {
      this.state.sceAutomation = new SCEAutomation({
        onProgress: (progress) => {
          this.showStatus(
            `Processing: ${progress.completed}/${progress.total} - ${progress.current.address}`,
            'info'
          );
        },
        onComplete: (results) => {
          this.showStatus(`Completed ${results.length} addresses`, 'success');
          // Re-enable buttons
          if (this.elements.mapProcessBtn) {
            this.elements.mapProcessBtn.disabled = false;
          }
          if (this.elements.rangeProcessBtn) {
            this.elements.rangeProcessBtn.disabled = false;
          }
        },
        onError: (error) => {
          this.showStatus(`Error: ${error.address} - ${error.error}`, 'error');
          // Re-enable buttons on error
          if (this.elements.mapProcessBtn) {
            this.elements.mapProcessBtn.disabled = false;
          }
          if (this.elements.rangeProcessBtn) {
            this.elements.rangeProcessBtn.disabled = false;
          }
          this.elements.generatePdfBtn.disabled = false;
        }
      });
    }

    // Start processing
    try {
      await this.state.sceAutomation.process(addresses);
    } catch (error) {
      console.error('[App] SCE automation error:', error);
      this.showStatus(`Processing failed: ${error.message}`, 'error');
      // Re-enable buttons on error
      if (this.elements.mapProcessBtn) {
        this.elements.mapProcessBtn.disabled = false;
      }
      if (this.elements.rangeProcessBtn) {
        this.elements.rangeProcessBtn.disabled = false;
      }
      this.elements.generatePdfBtn.disabled = false;
      this.state.autoGeneratePDF = false;
    }
  }

  // ============================================
  // BLOCK ROUTING
  // ============================================

  /**
   * Handle Round Block button click
   */
  handleRoundBlock() {
    if (!this.state.mapView) return;

    // Switch to map mode if not already there
    if (this.state.mode !== 'map') {
      this.switchMode('map');
    }

    // Enable block mode on the main map
    this.state.mapView.enableBlockMode();
    this.showStatus('Click on the map to detect a block', 'info');
  }

  /**
   * Handle block detected event
   */
  async handleBlockDetected(block) {
    this.state.currentBlock = block;

    const previewModal = new PreviewModal();
    const showRoute = await previewModal.show(block);

    if (showRoute) {
      this.showBlockRoutingView(block);
    }
  }

  /**
   * Show the block routing view with three-panel layout
   */
  showBlockRoutingView(block) {
    // Switch to block routing mode
    this.switchMode('block');

    // Update block info panel
    this.updateBlockInfo(block);

    // Render route list
    this.state.routeList = new RouteList(this.elements.routeList, {
      onItemClick: (address, index, isHover) => this.handleRouteItemClick(address, index, isHover)
    });
    this.state.routeList.render(block.addresses);

    // Initialize map for block routing
    if (!this.state.blockMapView) {
      this.state.blockMapView = L.map(this.elements.blockMap).setView([block.center.lat, block.center.lon], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(this.state.blockMapView);

      this.state.routeVisualizer = new RouteVisualizer(this.state.blockMapView);
    }

    // Visualize route
    this.state.routeVisualizer.visualizeRoute(block);

    // Show action buttons
    if (this.elements.clearRouteBtn) {
      this.elements.clearRouteBtn.style.display = 'inline-block';
    }
    if (this.elements.blockActions) {
      this.elements.blockActions.style.display = 'flex';
    }

    this.showStatus(`Block detected with ${block.totalAddresses} addresses`, 'success');
  }

  /**
   * Update block info panel with block details
   */
  updateBlockInfo(block) {
    if (!this.elements.blockInfo) return;

    this.elements.blockInfo.innerHTML = `
      <div class="block-info-detail">
        <div class="block-info-label">Total Addresses</div>
        <div class="block-info-value">${block.totalAddresses}</div>
      </div>
      <div class="block-info-detail">
        <div class="block-info-label">Est. Time</div>
        <div class="block-info-value">${block.estimatedTime}</div>
      </div>
    `;
  }

  /**
   * Handle route list item click or hover
   */
  handleRouteItemClick(address, index, isHover = false) {
    if (this.state.routeVisualizer) {
      if (isHover) {
        this.state.routeVisualizer.highlightAddress(index);
      } else {
        // Handle click - could show details
        console.log('[App] Route item clicked:', address);
      }
    }
  }

  /**
   * Handle clear route button click
   */
  handleClearRoute() {
    if (this.state.routeVisualizer) {
      this.state.routeVisualizer.clearRoute();
    }
    if (this.state.routeList) {
      this.state.routeList.clear();
    }
    if (this.elements.blockInfo) {
      this.elements.blockInfo.innerHTML = '<p class="block-info-empty">Click "Round Block" to detect a block</p>';
    }
    if (this.elements.blockActions) {
      this.elements.blockActions.style.display = 'none';
    }
    if (this.elements.clearRouteBtn) {
      this.elements.clearRouteBtn.style.display = 'none';
    }
    if (this.elements.routeCount) {
      this.elements.routeCount.textContent = '0';
    }
    this.state.currentBlock = null;
    this.showStatus('Route cleared', 'info');
  }

  /**
   * Handle Test One button click
   */
  handleTestOne() {
    this.showStatus('Test mode - processing first address only', 'info');

    // Get addresses based on current mode
    const addresses = this.state.mode === 'block'
      ? this.state.currentBlock?.addresses
      : this.state.generatedAddresses;

    if (!addresses || addresses.length === 0) {
      this.showStatus('No addresses to process', 'warning');
      return;
    }

    // Process just the first address
    this.processAddresses([addresses[0]]);
  }

  /**
   * Handle Process All button click
   */
  handleProcessAll() {
    this.showStatus('Processing all addresses...', 'info');

    // Get addresses based on current mode
    const addresses = this.state.mode === 'block'
      ? this.state.currentBlock?.addresses
      : this.state.generatedAddresses;

    if (!addresses || addresses.length === 0) {
      this.showStatus('No addresses to process', 'warning');
      return;
    }

    // Disable button during processing
    this.elements.processAllBtn.disabled = true;

    // Process all addresses
    this.processAddresses(addresses);
  }

  /**
   * Process addresses through SCE automation
   */
  async processAddresses(addresses) {
    // Initialize SCE automation
    if (!this.state.sceAutomation) {
      this.state.sceAutomation = new SCEAutomation({
        onProgress: (progress) => {
          const percent = Math.round((progress.completed / progress.total) * 100);
          const currentAddress = progress.current.address || progress.current.full || '';

          this.showStatus(
            `Processing: ${progress.completed}/${progress.total} (${percent}%) - ${currentAddress}`,
            'info'
          );

          // Update process-status span if exists
          const statusSpan = document.querySelector('.process-status');
          if (statusSpan) {
            statusSpan.textContent = `${progress.completed}/${progress.total} (${percent}%)`;
          }
        },
        onComplete: (results) => {
          this.showStatus(`Completed ${results.length} addresses`, 'success');
          this.elements.processAllBtn.disabled = false;

          // Clear process-status span when complete
          const statusSpan = document.querySelector('.process-status');
          if (statusSpan) {
            statusSpan.textContent = '';
          }
        },
        onError: (error) => {
          this.showStatus(`Error: ${error.address} - ${error.error}`, 'error');
        }
      });
    }

    // Start processing
    try {
      await this.state.sceAutomation.process(addresses);
    } catch (error) {
      console.error('[App] SCE automation error:', error);
      this.showStatus(`Processing failed: ${error.message}`, 'error');
      this.elements.processAllBtn.disabled = false;

      // Clear process-status span on error
      const statusSpan = document.querySelector('.process-status');
      if (statusSpan) {
        statusSpan.textContent = '';
      }
    }
  }

  // ============================================
  // STATUS MESSAGES
  // ============================================

  /**
   * Show a status message to the user
   */
  showStatus(message, type = 'info') {
    const el = this.elements.statusMessage;

    // Set message text (safe - no innerHTML)
    el.textContent = message;

    // Set type class
    el.className = 'status-message';
    el.classList.add(type);

    // Show
    el.classList.remove('hidden');

    // Auto-hide after 5 seconds
    setTimeout(() => {
      el.classList.add('hidden');
    }, 5000);
  }
}

// Initialize the app
const app = new RoutePlannerApp();

export default app;
