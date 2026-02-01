# SCE Proxy Server

Local proxy server for scraping property data from Zillow and Redfin.

## Installation

```bash
cd /home/sergio/Projects/SCE/playwright-automation/sce-proxy-server
npm install
```

## Usage

```bash
npm start
```

The server will run on `http://localhost:3000`

## API Endpoints

### Get Property Data
```
GET /api/property?address=22216%20Seine&zip=90716
```

Response:
```json
{
  "source": "zillow",
  "data": {
    "sqFt": "1200",
    "yearBuilt": "1970"
  }
}
```

### Health Check
```
GET /api/health
```

### Manual Cache Entry
```
POST /api/property/cache
{
  "address": "22216 Seine",
  "zip": "90716",
  "sqFt": "1200",
  "yearBuilt": "1970"
}
```

### View Cache
```
GET /api/cache
```

### Clear Cache
```
DELETE /api/cache
```

## Features

- **Multi-source scraping**: Zillow (primary), Redfin (fallback)
- **Local caching**: Results cached for 7 days
- **Persistent storage**: Cache saved to `property-cache.json`
- **Auto cleanup**: Expired entries removed automatically

## Integration with Extension

The extension automatically calls this proxy server when property data is needed.
