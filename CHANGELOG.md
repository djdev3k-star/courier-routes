# Changelog

All notable changes to LastMile Ledger will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-08

### Added

#### Core Features
- **Home Page** - SaaS-style landing with hero section, feature cards, and live stats preview
- **Weeks View** - Week-by-week navigation with earnings, trips, and goal progress
- **Monthly Routes View** - Day-by-day cards with expandable trip details
- **Stats Page** - Comprehensive analytics dashboard
- **Reports Page** - Historical data with export/print support
- **Interactive Map** - Mapbox-powered route visualization

#### Stats & Analytics
- Key Insights: Best day, top restaurant, peak hours, best weekday
- Restaurant Intelligence: Best tippers, most frequent, highest value restaurants
- Weekday Efficiency: Per-trip earnings analysis by day of week
- Trip Efficiency Analysis: Categorize trips (optimal, acceptable, short, long, low-pay)
- Tax Estimates: Mileage deduction calculator at IRS rate ($0.67/mile)

#### Reports & Tracking
- Refunds Tracker with auto-populated trip refunds
- Manual refund entry with receipt upload (image/PDF)
- Refund status tracking (pending, resolved, disputed)
- Monthly breakdown table
- Top earning days ranking
- Weekday totals chart

#### Search & Navigation
- Smart search with earnings filters (`>100`, `<50`, `over`, `under`)
- Month quick-filter buttons
- Global search across all views
- Week-by-week navigation with previous/next

#### Offline Features
- Manual trip entry form
- Batch CSV import with template
- LocalStorage persistence for offline trips and refunds
- Works without internet (except maps)

#### UI/UX
- Dark theme throughout
- Responsive design (mobile-friendly)
- Smooth animations and transitions
- Hover effects and tooltips
- Skeleton loading states
- Print-friendly report layouts

### Technical
- Vanilla JavaScript (no framework dependencies)
- Mapbox GL JS v3.0.1 for maps
- CSS custom properties for theming
- LocalStorage for client-side persistence
- Python data generation script

### Security
- HTML escaping for XSS protection
- Dropoff address masking for privacy
- Feature flags for sensitive features

---

## [0.1.0] - Initial Development

### Added
- Basic route visualization
- Day-by-day trip listing
- Simple earnings summary
- Map view prototype

[1.0.0]: https://github.com/yourusername/courier-routes/releases/tag/v1.0.0
[0.1.0]: https://github.com/yourusername/courier-routes/releases/tag/v0.1.0
