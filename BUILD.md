# Building from Source

## Prerequisites
- Node.js 18+

## Steps
```bash
npm install
node scripts/bundle.js --prod
node scripts/build.js chrome    # or: firefox, edge
```

The built extension will be in `dist/{browser}/`.
