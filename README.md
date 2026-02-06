# Courier Routes

A modern dashboard for visualizing delivery route data, earnings analytics, and trip history with interactive maps.

![Home Page](screenshots/home.png)

## Features

### Dashboard Home
- Quick stats overview (total earnings, trips, days active)
- Recent delivery activity
- Quick navigation to routes and reports

### Route Explorer
- **Smart Search** - Search by date, day name, or earnings
  - \over \\ or \> 100\ - Find days earning more than \
  - \under \\ or \< 50\ - Find days earning less than \
  - Text search for dates and day names
- **Month Filters** - Quick filter by month
- Interactive day cards with earnings visualization

![Routes Page](screenshots/routes.png)

### Reports Dashboard
- Total earnings breakdown
- Monthly performance table
- Top earning days ranking
- Weekday performance chart
- Key metrics: trips, tips, average per day

![Reports Page](screenshots/reports.png)

### Interactive Map View
- Mapbox-powered route visualization
- Trip-by-trip breakdown with pickup/dropoff markers
- Detailed trip information panel
- Day navigation (previous/next)

![Map View](screenshots/map.png)

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Maps**: Mapbox GL JS v3.0.1
- **Data**: JSON (generated from CSV source data)
- **Design**: Dark theme, responsive, SaaS-inspired UI

## Getting Started

### Prerequisites
- Python 3.x (for data generation and local server)
- Mapbox access token (already configured)

### Installation

1. Clone the repository
   \\\ash
   git clone https://github.com/djdev3k-star/courier-routes.git
   cd courier-routes
   \\\

2. Start a local server
   \\\ash
   python -m http.server 8080
   \\\

3. Open in browser
   \\\
   http://localhost:8080
   \\\

### Data Generation

To regenerate route data from source CSV files:

\\\ash
python generate_data.py
\\\

This reads trip and payment data from the consolidated data directory and outputs to \data/routes.json\.

## Project Structure

\\\
courier-routes/
├── index.html          # Main SPA entry point
├── css/
│   └── styles.css      # All styling (dark theme)
├── js/
│   └── app.js          # Application logic
├── data/
│   └── routes.json     # Generated trip data
├── screenshots/        # README images
└── generate_data.py    # Data extraction script
\\\

## Screenshots

| Home | Routes | Reports | Map |
|------|--------|---------|-----|
| ![](screenshots/home-thumb.png) | ![](screenshots/routes-thumb.png) | ![](screenshots/reports-thumb.png) | ![](screenshots/map-thumb.png) |

## Usage

### Navigation
- Use the top navigation bar to switch between Home, Routes, and Reports
- Click any day card to open the interactive map view

### Search Examples
- \Monday\ - Show all Mondays
- \December\ - Show December days
- \over 150\ - Days with earnings over \
- \< 75\ - Days with earnings under \

## License

MIT

---

Built with Mapbox GL JS
