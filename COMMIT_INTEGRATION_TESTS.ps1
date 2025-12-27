# Quick commit script for integration tests
# Run this from the project root

Write-Host "Adding integration test files..." -ForegroundColor Cyan

# Add all test files
git add tests/

# Add root documentation
git add INTEGRATION_TESTS_*.md
git add DEPLOYMENT_AUTOMATION.md
git add QUICK_DEPLOY.md
git add FIX_PRICING_BUTTON.md
git add ENV_FILE_SETUP.md

# Add scripts
git add scripts/

# Add CI/CD updates
git add .github/workflows/deploy.yml

Write-Host "`nFiles staged. Review with: git status" -ForegroundColor Yellow
Write-Host "`nTo commit, run:" -ForegroundColor Green
Write-Host 'git commit -m "Add comprehensive integration test suite

- Add Playwright-based integration tests for web and desktop
- Add test utilities (file loader, PDF inspector, image validator)
- Add example tests for 8+ tools (background remover, PDF tools, etc.)
- Add comprehensive documentation and setup guides
- Add CI/CD integration (tests run before deployment)
- Add helper scripts for server management
- Add test fixtures (images and PDFs)"' -ForegroundColor Cyan

