# Route Processor Module

The Route Processor module (`route-processor.js`) provides background batch processing capabilities for the SCE Route Planner feature. It handles opening tabs, filling forms, capturing data, and taking screenshots across multiple addresses.

## Features

- **Batch Processing**: Process up to 50 addresses in a single batch
- **Concurrency Control**: Process up to 3 tabs concurrently (configurable)
- **Retry Logic**: Automatically retry failed addresses up to 2 times
- **Progress Tracking**: Real-time progress updates for UI feedback
- **Screenshot Capture**: Optional screenshot capture after form filling
- **Data Collection**: Capture form data and homeowner information
- **Error Handling**: Graceful error handling with detailed error messages

## API

### Functions

#### `processRouteAddress(address, config, progressCallback)`

Process a single address in a new tab.

**Parameters:**
- `address` (Object): Address object with properties:
  - `number` (string): Street number
  - `street` (string): Street name
  - `city` (string): City name (optional)
  - `state` (string): State abbreviation
  - `zip` (string): 5-digit ZIP code
  - `full` (string): Full address string
- `config` (Object, optional): Configuration overrides
- `progressCallback` (Function, optional): Progress callback function

**Returns:** Promise<Object> with properties:
- `success` (boolean): True if successful
- `address` (string): Full address
- `capturedData` (Object): Captured form data
- `screenshot` (string): Base64 screenshot data URL
- `error` (string): Error message if failed
- `timestamp` (string): ISO timestamp

#### `processRouteBatch(addresses, config, progressCallback)`

Process a batch of addresses with concurrency control.

**Parameters:**
- `addresses` (Array<Object>): Array of address objects
- `config` (Object, optional): Configuration overrides
- `progressCallback` (Function, optional): Progress callback function

**Returns:** Promise<Object> with properties:
- `batchId` (string): Unique batch identifier
- `summary` (Object): Batch summary { total, successful, failed, duration }
- `results` (Array<Object>): Array of individual address results

**Throws:** Error if validation fails or batch size exceeds maximum

#### `getBatchStatus(batchId)`

Get status of an active batch.

**Parameters:**
- `batchId` (string): Batch identifier

**Returns:** Object or null:
- `id` (string): Batch ID
- `total` (number): Total addresses
- `processed` (number): Processed count
- `successful` (number): Successful count
- `failed` (number): Failed count
- `status` (string): 'running', 'complete', 'error', 'cancelled'
- `startTime` (number): Start timestamp
- `endTime` (number): End timestamp (if complete)

#### `cancelRouteBatch(batchId)`

Cancel an active batch.

**Parameters:**
- `batchId` (string): Batch identifier

**Returns:** boolean - true if cancelled, false if not found

#### `validateRouteAddress(address)`

Validate address before processing.

**Parameters:**
- `address` (Object): Address object

**Returns:** Object:
- `valid` (boolean): True if valid
- `errors` (Array<string>): List of validation errors

#### `cleanupOldBatches(maxAge)`

Clean up old batch data from memory.

**Parameters:**
- `maxAge` (number, optional): Maximum age in milliseconds (default: 1 hour)

**Returns:** number - Count of cleaned batches

## Configuration

### Default Config

```javascript
{
  captureDelay: 5000,           // 5 seconds for data capture
  tabOpenDelay: 2000,           // 2 seconds between opening tabs
  screenshotDelay: 1000,        // 1 second before screenshot
  maxConcurrentTabs: 3,         // Maximum concurrent tabs
  maxBatchSize: 50,             // Maximum batch size
  retryAttempts: 2,             // Retry failed addresses
  retryDelay: 3000,             // Delay before retry (ms)
  progressBarUpdateInterval: 500 // Progress update interval
}
```

### Custom Config

Pass custom config to override defaults:

```javascript
const config = {
  maxConcurrentTabs: 5,
  captureDelay: 3000,
  retryAttempts: 3
};

await processRouteBatch(addresses, config);
```

## Usage Example

### From Background Script

```javascript
// In background.js
importScripts('modules/route-processor.js');

// Process batch
const addresses = [
  { number: '1909', street: 'W Martha Ln', city: 'Santa Ana', state: 'CA', zip: '92706', full: '1909 W Martha Ln, Santa Ana, CA 92706' },
  { number: '1911', street: 'W Martha Ln', city: 'Santa Ana', state: 'CA', zip: '92706', full: '1911 W Martha Ln, Santa Ana, CA 92706' }
];

const result = await SCERouteProcessor.processRouteBatch(addresses, {}, (progress) => {
  console.log(`${progress.current}/${progress.total}: ${progress.message}`);
});

console.log(`Batch complete: ${result.summary.successful}/${result.summary.total} successful`);
```

### From Content Script via Message

```javascript
// In content script or popup
chrome.runtime.sendMessage({
  action: 'processRouteBatch',
  addresses: addresses,
  config: { maxConcurrentTabs: 3 }
}, (response) => {
  if (response.success) {
    console.log('Batch result:', response.result);
  } else {
    console.error('Batch error:', response.error);
  }
});
```

## Progress Callback Events

The progress callback receives updates with these types:

- `batch_start`: Batch processing started
- `start`: Starting individual address
- `tab_opened`: Tab opened successfully
- `form_filled`: Form filled successfully
- `screenshot_captured`: Screenshot taken
- `complete`: Address completed successfully
- `error`: Address failed with error
- `retry`: Retrying failed address
- `progress`: General progress update
- `batch_complete`: Batch processing finished
- `batch_error`: Batch processing error

## Error Handling

The module includes comprehensive error handling:

1. **Validation Errors**: Caught before processing starts
2. **Tab Errors**: Tabs automatically closed on error
3. **Retry Logic**: Failed addresses automatically retried
4. **Batch Errors**: Partial results preserved on batch failure

## Memory Management

- Active batches stored in Map for 60 seconds after completion
- Automatic cleanup of old batches every 5 minutes
- Manual cleanup available via `cleanupOldBatches()`

## Testing

Run tests with:

```bash
cd sce-extension
npm test modules/route-processor.test.js
```

## Integration

The route processor integrates with:

1. **Background Script** (`background.js`): Main entry point for batch processing
2. **Tab Manager** (`tab-manager.js`): Content script integration
3. **Address Generator** (`address-generator.js`): Address generation utilities
4. **Content Script** (`content.js`): Form filling logic

## Limitations

- Maximum 50 addresses per batch (configurable)
- Maximum 3 concurrent tabs (configurable)
- 2 retry attempts per address (configurable)
- Requires 'tabs' permission in manifest.json
