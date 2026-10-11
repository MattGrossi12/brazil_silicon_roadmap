# Brazil Silicon Roadmap

This repository consolidates the Brazilian semiconductor, microelectronics, ASIC/SoC, and FPGA ecosystem into a bilingual map built from spreadsheet data. The source material in `existing-spreadsheets/` is transformed into a structured dataset used by the static interactive atlas under `docs/`.

[![Brazil Silicon Roadmap](./roadmap.jpeg)](./roadmap.jpeg)

## Overview

The roadmap tracks organizations working in hardware design, semiconductor research, FPGA development, embedded systems, and related applied electronics across Brazil. The current dataset is based on:

- `existing-spreadsheets/road_map_table_EN.xlsx` — English source workbook
- `existing-spreadsheets/road_map_table_PT-BR.xlsx` — Portuguese source workbook

## Dataset snapshot

From the source spreadsheets and generated dataset in `docs/data/companies.json`:

- 48 organizations identified
- 70 mapped points across Brazil
- 13 geographic clusters identified
- 5 organization categories represented

The map covers major hubs such as Manaus, Brasília, Campina Grande, Salvador, Belo Horizonte, Campinas, Florianópolis, Porto Alegre, Curitiba, São José dos Campos, and other semiconductor and electronics clusters across the country.

## Repository structure

- `existing-spreadsheets/` — source workbooks in English and Portuguese
- `scripts/convert_xlsx.py` — converts the spreadsheets into the JSON used by the website
- `docs/data/companies.json` — generated dataset used by the browser app
- `docs/` — static interactive map and web assets
- `INTERACTIVE_MAP.md` — local build and deployment instructions

## Regenerating the map

From the repository root:

```powershell
py -m pip install -r requirements.txt
py .\scripts\convert_xlsx.py `
  --english .\existing-spreadsheets\road_map_table_EN.xlsx `
  --portuguese .\existing-spreadsheets\road_map_table_PT-BR.xlsx `
  --output .\docs\data\companies.json
```

Then serve the site locally:

```powershell
py -m http.server 8000 --directory docs
```

Open `http://localhost:8000` in a browser.

## Data included in each entry

Each organization in the spreadsheet contains:

- company name
- type of organization
- activity description
- source/reference URL
- geographic cluster(s) in Brazil

This keeps the map aligned with the source spreadsheets and makes it easy to update the project when new companies or regions are added.

## License and source

The repository is built for public research and ecosystem mapping. The data and site are maintained in this project and are intended to support visibility for Brazil's semiconductor and microelectronics ecosystem.