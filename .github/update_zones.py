name: Update Zones

on:
  push:
    paths:
      - "zones/*.html"
      - ".github/update_zones.py"
      - ".github/workflows/update-zones.yml"

permissions:
  contents: write

jobs:
  update-zones:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.x"

      - name: Update frontend.html
        run: python .github/update_zones.py

      - name: Commit changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

          git add frontend.html

          if git diff --cached --quiet; then
            echo "No changes to commit"
          else
            git commit -m "Auto-update zones"
            git push
          fi
