#!/bin/bash
echo "Checking which .md files will be tracked by Git:"
echo ""
echo "Files that will be INCLUDED:"
git check-ignore -v *.md 2>/dev/null | grep "!" || echo "- README.md (only this one!)"
echo ""
echo "Files that will be EXCLUDED:"
for file in *.md; do
  if [ "$file" != "README.md" ]; then
    if git check-ignore -q "$file" 2>/dev/null || [ ! -d .git ]; then
      echo "- $file ✓"
    else
      echo "- $file ✗ (WARNING: NOT IGNORED!)"
    fi
  fi
done
