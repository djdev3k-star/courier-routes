# Courier Routes

Interactive delivery route visualization and analytics app.

## Features

- **Splash Dashboard** - Overview of all earnings, trips, and miles with quick stats
- **Daily Route Maps** - Interactive Mapbox maps showing delivery routes for each day
- **Trip Details** - Click any trip to see earnings breakdown, addresses, and timing
- **Search & Filter** - Find specific days or trips quickly
- **Payment Breakdown** - View base fare, tips, incentives, and refunds for each trip

## Setup

1. Generate the data file from your courier data:
   ```
   python generate_data.py
   ```

2. Open `index.html` in a browser (requires internet for Mapbox)

Or serve locally:
```
python -m http.server 8000
```
Then visit `http://localhost:8000`

## Project Structure

```
courier-routes/
├── index.html          # Main app entry point
├── css/
│   └── styles.css      # All styles
├── js/
│   └── app.js          # App logic
├── data/
│   └── routes.json     # Generated trip data
└── generate_data.py    # Data generation script
```

## Data Source

Data is extracted from Uber Eats trip and payment CSV exports, geocoded addresses, and consolidated into a single JSON file for the app.

## Tech Stack

- Vanilla JavaScript (no framework)
- Mapbox GL JS for maps
- CSS Grid/Flexbox for layout
- Inter font family
