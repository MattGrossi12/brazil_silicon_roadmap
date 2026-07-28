# Interactive map

The website is a static, bilingual atlas generated from the English and
Portuguese workbooks in `existing-spreadsheets/`.

## Local preview on Windows

From the repository root, rebuild the data:

```powershell
py -m pip install -r requirements.txt
py .\scripts\convert_xlsx.py `
  --english .\existing-spreadsheets\road_map_table_EN.xlsx `
  --portuguese .\existing-spreadsheets\road_map_table_PT-BR.xlsx `
  --output .\docs\data\companies.json
```

Start the local server:

```powershell
py -m http.server 8000 --directory docs
```

Open `http://localhost:8000`.

## GitHub Pages

In the fork, open `Settings`, then `Pages`, and choose `GitHub Actions` as the
source. Pushing `main` or `feature/interactive-map` runs the deployment.

The spreadsheet converter checks that all 13 geographic headings are
recognized, then regenerates the JSON used by the map. Broad regions use
representative coordinates and are identified as approximate in the interface.

Brazil state boundaries are adapted from
[`click_that_hood`](https://github.com/codeforgermany/click_that_hood) under the
MIT License.
