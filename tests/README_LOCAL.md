# Running Tests Locally

## Quick Start

**IMPORTANT**: You must start the servers before running tests!

### Option 1: Start Servers Manually (Recommended)

1. **Start Backend** (in a separate terminal):
   ```bash
   cd python-backend
   python -m uvicorn api:app --host 0.0.0.0 --port 8000
   ```

2. **Start Frontend** (in another terminal):
   ```bash
   cd website
   npm run dev
   ```

3. **Run Tests** (in a third terminal):
   ```bash
   cd tests
   npm run test:web:local
   ```

### Option 2: Use the Regular Config (Auto-start servers)

If servers aren't running, use the regular config which will start them:

```bash
cd tests
npm run test:web
```

**Note**: This may fail if servers are already running (port conflict).

## Verify Servers Are Running

Check if servers are accessible:

```bash
# Backend
curl http://localhost:8000/

# Frontend  
curl http://localhost:3000/
```

## Troubleshooting

### Error: `ERR_CONNECTION_REFUSED`

**Cause**: Frontend or backend server isn't running.

**Fix**: Start both servers (see Option 1 above).

### Error: Port already in use

**Cause**: Server is already running in another terminal.

**Fix**: Either:
- Use `npm run test:web:local` (assumes servers are running)
- Or stop the existing server and use `npm run test:web`

### Tests Timeout

**Cause**: Processing takes longer than expected.

**Fix**: Tests have a 3-minute timeout. If your operations take longer, increase the timeout in `playwright.config.ts`.

