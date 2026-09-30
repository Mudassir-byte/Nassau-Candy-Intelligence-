# Nassau Candy Intelligence

A polished, interactive business-intelligence dashboard for the Nassau Candy
Distributor dataset. The application analyzes sales, gross profit, product
economics, customers, geographic markets, ship modes, and factory-to-state
shipping routes.

## Features

- Executive KPI cards
- Monthly sales and profit trend
- Region, state, division, and product performance
- Product profitability heatmap
- Customer order-frequency cohorts
- Average-order-value distribution
- Factory-to-state shipping network
- Ship-mode comparison
- Fastest and slowest high-volume route benchmarks
- Filterable, exportable order explorer
- Product detail table
- Shipping data-quality diagnostics
- LocalStorage persistence for filters and selected analytics tab

## Data enrichment

The application derives the following fields from the raw CSV:

- Parsed order and ship dates
- Shipping lead time
- Month key
- Factory assignment based on Product ID
- Customer location label
- Product and route aggregations
- Gross margin
- Delay frequency using a configurable lead-time threshold

## Setup

Place exactly one `.csv` file directly in the `data/` folder. The dashboard
discovers it from the local web server's directory listing. A copy is also
embedded in `assets/js/embedded-data.js`, so opening `index.html` directly loads
the dataset without a server.

```text
data/Nassau Candy Distributor (Dataset).csv
```

To refresh the embedded copy after replacing the CSV, run this from the project
root in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\embed-dataset.ps1
```

Alternatively, start the local server from the project root:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000>. If there is more than one CSV in `data/`,
the dashboard asks you to choose a file manually.