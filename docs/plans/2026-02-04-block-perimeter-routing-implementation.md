# Block Perimeter Routing - Implementation Plan

**Date:** 2026-02-04
**Status:** Ready for Implementation
**Design Document:** `/home/sergio/Projects/SCE/docs/plans/2026-02-04-block-perimeter-routing-design.md`
**Estimated Time:** 8-12 hours (4 phases, ~2-3 hours each)

---

## Overview

Implement "round the block" canvassing with automatic SCE form processing and multi-page PDF generation. This plan breaks down the design into bite-sized TDD tasks (2-5 minutes each).

---

## Phase 1: Block Perimeter Foundation (2-3 hours)

### 1.1 Create Block Detector Module

**File:** `/home/sergio/Projects/SCE/sce-webapp/js/block-detector.js`

**Task:** Create the core block detection module with Overpass integration

[See full code in design document - this is a summary]

**Test:**
```bash
cd /home/sergio/Projects/SCE/sce-webapp
node --experimental-modules js/block-detector.test.js
```

**Commit:**
```bash
git add sce-webapp/js/block-detector.js
git commit -m "feat: add block detector module with Overpass integration

- Query surrounding streets via Overpass API
- Build block topology from intersecting streets
- Extract addresses from building polygons or street ranges
- Calculate estimated walking time"
```

### 1.2 Create Address Ordering Module

**File:** `/home/sergio/Projects/SCE/sce-webapp/js/address-ordering.js`

**Task:** Implement clockwise ordering algorithm

**Commit:**
```bash
git add sce-webapp/js/address-ordering.js
git commit -m "feat: add clockwise address ordering module"
```

### 1.3 Create Route Visualizer Module

**File:** `/home/sergio/Projects/SCE/sce-webapp/js/route-visualizer.js`

**Task:** Create map markers and polylines

**Commit:**
```bash
git add sce-webapp/js/route-visualizer.js sce-webapp/css/style.css
git commit -m "feat: add route visualizer with numbered markers"
```

### 1.4 Update Map View for Block Detection

**File:** `/home/sergio/Projects/SCE/sce-webapp/js/map-view.js`

**Task:** Add block detection trigger on map click

**Commit:**
```bash
git add sce-webapp/js/map-view.js
git commit -m "feat: add block detection trigger on map click"
```

---

## Phase 2: User Workflow (2-3 hours)

### 2.1 Create Preview Modal Component

**File:** `/home/sergio/Projects/SCE/sce-webapp/js/preview-modal.js`

**Commit:**
```bash
git add sce-webapp/js/preview-modal.js sce-webapp/css/style.css
git commit -m "feat: add block preview modal component"
```

### 2.2 Create Three-Panel Layout

**File:** `/home/sergio/Projects/SCE/sce-webapp/index.html`

**Commit:**
```bash
git add sce-webapp/index.html sce-webapp/css/style.css
git commit -m "feat: add three-panel layout for route visualization"
```

### 2.3 Create Route List Component

**File:** `/home/sergio/Projects/SCE/sce-webapp/js/route-list.js`

**Commit:**
```bash
git add sce-webapp/js/route-list.js sce-webapp/css/style.css
git commit -m "feat: add interactive route list component"
```

### 2.4 Update Main App for Block Routing

**File:** `/home/sergio/Projects/SCE/sce-webapp/js/app.js`

**Commit:**
```bash
git add sce-webapp/js/app.js
git commit -m "feat: integrate block detection with main app workflow"
```

---

## Phase 3: SCE Integration (2-3 hours)

### 3.1 Create SCE Automation Module

**File:** `/home/sergio/Projects/SCE/sce-webapp/js/sce-automation.js`

**Commit:**
```bash
git add sce-webapp/js/sce-automation.js
git commit -m "feat: add SCE automation queue processor"
```

### 3.2 Create Tampermonkey Userscript

**File:** `/home/sergio/Projects/SCE/sce-webapp/userscripts/SCE-AutoFill.user.js`

**Commit:**
```bash
git add sce-webapp/userscripts/SCE-AutoFill.user.js
git commit -m "feat: add Tampermonkey userscript for SCE automation"
```

### 3.3 Create Progress Persistence Module

**File:** `/home/sergio/Projects/SCE/sce-webapp/js/progress-persistence.js`

**Commit:**
```bash
git add sce-webapp/js/progress-persistence.js
git commit -m "feat: add progress persistence module"
```

### 3.4 Integrate SCE Automation with App

**File:** `/home/sergio/Projects/SCE/sce-webapp/js/app.js`

**Commit:**
```bash
git add sce-webapp/js/app.js sce-webapp/css/style.css
git commit -m "feat: integrate SCE automation with app UI"
```

---

## Phase 4: PDF Enhancement (1-2 hours)

### 4.1 Update PDF Generator for Multi-Page

**File:** `/home/sergio/Projects/SCE/sce-webapp/js/pdf-generator.js`

**Commit:**
```bash
git add sce-webapp/js/pdf-generator.js
git commit -m "feat: enhance PDF generator with multi-page and SCE data"
```

### 4.2 Add Progress Bar to UI

**File:** `/home/sergio/Projects/SCE/sce-webapp/index.html`

**Commit:**
```bash
git add sce-webapp/index.html sce-webapp/css/style.css sce-webapp/js/app.js
git commit -m "feat: add progress bar with playback controls"
```

### 4.3 Create Userscript Installation Guide

**File:** `/home/sergio/Projects/SCE/docs/userscripts/INSTALLATION.md`

**Commit:**
```bash
git add docs/userscripts/INSTALLATION.md
git commit -m "docs: add userscript installation guide"
```

---

## Final Integration & Testing (1 hour)

### 5.1 Update Main HTML

**Commit:**
```bash
git add sce-webapp/index.html
git commit -m "feat: add Round Block mode button and module imports"
```

### 5.2 End-to-End Testing

**Commit:**
```bash
git add sce-webapp/
git commit -m "test: document manual testing results"
```

### 5.3 Create Documentation

**File:** `/home/sergio/Projects/SCE/docs/BLOCK_PERIMETER_ROUTING.md`

**Commit:**
```bash
git add docs/BLOCK_PERIMETER_ROUTING.md
git commit -m "docs: add comprehensive block perimeter routing guide"
```

---

## Summary

This implementation plan breaks down the Block Perimeter Routing feature into **bite-sized TDD tasks** organized into **4 phases**:

1. **Phase 1: Block Perimeter Foundation** (2-3 hours) - Block detection, ordering, visualization
2. **Phase 2: User Workflow** (2-3 hours) - Preview modal, three-panel layout, route list
3. **Phase 3: SCE Integration** (2-3 hours) - Automation queue, userscript, progress persistence
4. **Phase 4: PDF Enhancement** (1-2 hours) - Multi-page PDF, SCE data, progress controls

**Total Estimated Time**: 8-12 hours
**Total Tasks**: ~35 bite-sized commits

Each task includes:
- Exact file paths
- Complete code
- Test commands
- Commit messages
