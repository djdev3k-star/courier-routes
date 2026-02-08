# LastMile Ledger

> Track every mile. Maximize every dollar.

A modern analytics dashboard for gig delivery drivers. Visualize routes, track earnings, analyze efficiency, and take control of your delivery hustle.

![Home Page](screenshots/home.png)

## Features

### Dashboard Home
- SaaS-style landing with quick stats overview
- Total earnings, trips, miles logged at a glance
- Quick navigation to all views

### Weeks View
- Week-by-week earnings breakdown
- Visual progress bars for weekly goals
- Quick stats per week (trips, earnings, tips)

### Monthly Routes View
- Day-by-day route cards with earnings visualization
- **Smart Search** - Search by date, day name, or earnings
  - `>100` or `over 100` - Find days earning more than $100
  - `<50` or `under 50` - Find days earning less than $50
  - Text search for dates and day names
- **Month Filters** - Quick filter by month
- Expandable trip details with pickup/dropoff info

![Routes Page](screenshots/routes.png)

### Stats Page
- **Key Insights** - Best day, top restaurant, peak hours, best weekday
- **Restaurant Intelligence** - Best tippers, most frequent, highest value
- **Weekday Efficiency** - Per-trip earnings by day of week
- **Trip Efficiency Analysis** - Categorize trips as optimal, acceptable, short, long, or low-pay
- **Tax Estimates** - Mileage deduction calculator at IRS rate

### Reports Page
- Total earnings breakdown with date range
- Monthly performance table
- Top earning days ranking
- Weekday totals chart
- **Refunds Tracker** - Auto-populated from trip data + manual entry with receipt uploads

![Reports Page](screenshots/reports.png)

### Interactive Map View
- Mapbox-powered route visualization
- Trip-by-trip breakdown with pickup/dropoff markers
- Connected route lines showing your delivery path
- Day navigation (previous/next)

![Map View](screenshots/map.png)

### Offline Features
- Manual trip entry form
- Batch CSV import
- LocalStorage persistence
- Works without internet (except maps)

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Maps**: Mapbox GL JS v3.0.1
- **Data**: JSON (generated from CSV source data)
- **Storage**: LocalStorage for offline data
- **Design**: Dark theme, responsive, mobile-friendly

## Getting Started

### Prerequisites
- Python 3.x (for data generation and local server)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/courier-routes.git
   cd courier-routes
   ```

2. **Start a local server**
   ```bash
   python -m http.server 8080
   ```

3. **Open in browser**
   ```
   http://localhost:8080
   ```

### Data Generation

To regenerate route data from source CSV files:

```bash
python generate_data.py
```

Configure source paths in `generate_data.py`:
- `SOURCE_DIR` - Base directory for data files
- `TRIPS_DIR` - Directory containing trip CSVs
- `PAYMENTS_DIR` - Directory containing payment CSVs
- `GEOCODED_FILE` - Geocoded addresses for map coordinates

## Project Structure

```
courier-routes/
├── index.html              # Main SPA entry point
├── css/
│   ├── styles.css          # Main stylesheet (dark theme)
│   └── print.css           # Print-friendly styles
├── js/
│   └── app.js              # Application logic & state
├── data/
│   ├── routes.json         # Generated trip data
│   └── offline_trips_template.csv  # Template for batch import
├── screenshots/            # README images
├── generate_data.py        # Data extraction/transformation
└── README.md
```

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Single-page app with all views, modals, and structure |
| `js/app.js` | State management, rendering, search, analytics |
| `css/styles.css` | Complete styling with CSS variables for theming |
| `generate_data.py` | Transforms CSV exports into app-ready JSON |

## Configuration

### Mapbox Token
The Mapbox access token is in `js/app.js`. For production, move to environment variable:
```javascript
const MAPBOX_TOKEN = 'your-token-here';
```

### Weekly Goal
Default weekly earnings goal is $500. Configurable in onboarding or settings.

### Mileage Rate
Default IRS mileage rate is $0.67/mile for tax deduction estimates.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Mapbox](https://www.mapbox.com/) for map rendering
- [Inter](https://fonts.google.com/specimen/Inter) font family
- Inspired by [Gridwise](https://gridwise.io/) and delivery driver communities

---

**Built for gig drivers, by a gig driver.**
