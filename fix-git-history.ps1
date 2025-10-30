# PowerShell script to clean Git history of sensitive files
# This removes gcs-key.json from all commits

Write-Host "🔧 Cleaning Git history to remove sensitive credentials..." -ForegroundColor Yellow

# Method 1: Using git filter-repo (recommended but requires installation)
if (Get-Command git-filter-repo -ErrorAction SilentlyContinue) {
    Write-Host "Using git-filter-repo..." -ForegroundColor Green
    git filter-repo --path gcs-key.json --invert-paths --force
} else {
    # Method 2: Using git filter-branch (built-in but slower)
    Write-Host "Using git filter-branch..." -ForegroundColor Cyan
    $env:FILTER_BRANCH_SQUELCH_WARNING = "1"
    git filter-branch --force --index-filter "git rm --cached --ignore-unmatch gcs-key.json" --prune-empty --tag-name-filter cat -- --all
    
    # Clean up
    Remove-Item -Recurse -Force .git/refs/original/ -ErrorAction SilentlyContinue
    git reflog expire --expire=now --all
    git gc --prune=now --aggressive
}

Write-Host "✅ Git history cleaned!" -ForegroundColor Green
Write-Host "Now run: git push --force" -ForegroundColor Yellow
