# GitHub Actions CI Configuration

Add this workflow to `.github/workflows/tests.yml`:

```yaml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test-web:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    services:
      # Optional: Use services if needed
      # postgres:
      #   image: postgres:15
      #   env:
      #     POSTGRES_PASSWORD: test
      #   options: >-
      #     --health-cmd pg_isready
      #     --health-interval 10s
      #     --health-timeout 5s
      #     --health-retries 5
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: tests/package-lock.json
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
          cache: 'pip'
          cache-dependency-path: python-backend/requirements.txt
      
      - name: Install Python dependencies
        run: |
          cd python-backend
          pip install -r requirements.txt
      
      - name: Install test dependencies
        run: |
          cd tests
          npm install
      
      - name: Install Playwright browsers
        run: |
          cd tests
          npx playwright install --with-deps
      
      - name: Start backend server
        run: |
          cd python-backend
          python -m uvicorn api:app --host 0.0.0.0 --port 8000 &
          sleep 5
        env:
          CORS_ORIGINS: "*"
      
      - name: Start frontend server
        run: |
          cd website
          npm install
          npm run build
          npm start &
          sleep 10
        env:
          NODE_ENV: production
          NEXT_PUBLIC_API_URL: http://localhost:8000
      
      - name: Run web tests
        run: |
          cd tests
          npm run test:web
        env:
          CI: true
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: |
            tests/test-results/
            tests/playwright-report/
          retention-days: 7
      
      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: tests/test-results/html/
          retention-days: 7

  test-desktop:
    runs-on: ${{ matrix.os }}
    timeout-minutes: 45
    
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Setup Rust (for Tauri)
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      
      - name: Install test dependencies
        run: |
          cd tests
          npm install
          npx playwright install --with-deps
      
      - name: Build desktop app
        run: |
          npm install
          npm run tauri build
        env:
          # Add any build-time environment variables
      
      - name: Run desktop tests
        run: |
          cd tests
          npm run test:desktop
        env:
          CI: true
          DESKTOP_APP_PATH: ${{ github.workspace }}/src-tauri/target/release/offline-tools
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: desktop-test-results-${{ matrix.os }}
          path: tests/test-results/
          retention-days: 7
```

## 🔧 Configuration Notes

1. **Backend Server**: Starts in background, waits 5 seconds for startup
2. **Frontend Server**: Builds and starts production server
3. **Test Artifacts**: Uploads test results and reports for review
4. **Matrix Strategy**: Desktop tests run on multiple OS (if needed)

## 📊 Test Reports

After tests run, download artifacts to view:
- HTML test reports
- Screenshots of failures
- Video recordings
- Test output files

## 🚀 Optimization Tips

1. **Cache dependencies**: Already configured for Node and Python
2. **Parallel jobs**: Web and desktop tests run in parallel
3. **Fail fast**: Set `fail-fast: true` to stop on first failure (optional)
4. **Timeout**: Adjust `timeout-minutes` based on test duration

## 🔍 Debugging CI Failures

1. Check test artifacts for screenshots/videos
2. Review backend logs in test output
3. Verify environment variables are set
4. Check if servers started correctly

