# Advanced Speed Meter - Vercel Deployment Guide

## Quick Deployment Steps

### 1. Prepare Your Project Structure
```
speed-meter-pro/
├── index.html
├── style.css
├── app.js
├── package.json
└── vercel.json
```

### 2. Create package.json
```json
{
  "name": "speed-meter-pro",
  "version": "1.0.0",
  "description": "Advanced real-time internet speed testing application",
  "main": "index.html",
  "scripts": {
    "build": "echo 'No build step required for static app'",
    "start": "serve -s ."
  },
  "dependencies": {},
  "devDependencies": {
    "serve": "^14.0.0"
  }
}
```

### 3. Create vercel.json Configuration
```json
{
  "version": 2,
  "builds": [
    {
      "src": "**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/download",
      "dest": "/api/download.js"
    },
    {
      "src": "/api/upload",
      "dest": "/api/upload.js"
    },
    {
      "src": "/api/ping",
      "dest": "/api/ping.js"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "functions": {
    "api/download.js": {
      "maxDuration": 30
    },
    "api/upload.js": {
      "maxDuration": 30
    }
  }
}
```

### 4. Create API Functions for Speed Testing

#### api/download.js
```javascript
export default function handler(req, res) {
  const size = parseInt(req.query.size) || 5 * 1024 * 1024; // Default 5MB
  const maxSize = 50 * 1024 * 1024; // 50MB max for Vercel limits
  
  const actualSize = Math.min(size, maxSize);
  const buffer = Buffer.alloc(actualSize, 'x');
  
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', actualSize);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  res.send(buffer);
}
```

#### api/upload.js
```javascript
export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  let bytesReceived = 0;
  
  req.on('data', (chunk) => {
    bytesReceived += chunk.length;
  });
  
  req.on('end', () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ 
      status: 'success',
      bytesReceived 
    });
  });
  
  req.on('error', (err) => {
    res.status(500).json({ error: 'Upload failed' });
  });
}
```

#### api/ping.js
```javascript
export default function handler(req, res) {
  const startTime = Date.now();
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');
  
  res.status(200).json({
    timestamp: startTime,
    server: 'vercel'
  });
}
```

### 5. Deploy to Vercel

#### Option A: Using Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Option B: Using Git Integration
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Deploy automatically

### 6. Environment Configuration

Add environment variables in Vercel dashboard:
```
NODE_ENV=production
MAX_FILE_SIZE=50000000
CORS_ORIGIN=*
```

### 7. Performance Optimizations

#### Headers Configuration
Add to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

### 8. Custom Domain Setup
1. Add your domain in Vercel dashboard
2. Configure DNS records
3. SSL certificate will be automatically provisioned

### 9. Monitoring and Analytics
- Enable Vercel Analytics in project settings
- Monitor function execution times
- Track performance metrics

## Troubleshooting

### Common Issues:
1. **Function timeout**: Increase `maxDuration` in `vercel.json`
2. **CORS errors**: Ensure proper headers in API functions
3. **Large file limits**: Vercel has 4.5MB payload limit for functions

### Performance Tips:
- Use CDN for static assets
- Implement service worker caching
- Optimize image and font loading
- Monitor Core Web Vitals

## Additional Features for Production

### Service Worker Implementation
Create `sw.js` for offline functionality:
```javascript
const CACHE_NAME = 'speed-meter-v1';
const urlsToCache = [
  '/',
  '/style.css',
  '/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});
```

### Progressive Web App
Add to `index.html`:
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#21808d">
```

This configuration provides a production-ready deployment with proper API endpoints, security headers, and performance optimizations specifically tailored for Vercel's serverless environment.
