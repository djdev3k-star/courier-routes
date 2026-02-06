// Courier Routes App
const MAPBOX_TOKEN = 'pk.eyJ1IjoibXBieDE1IiwiYSI6ImNta2Y1a3dxZzAzZ3AzZ29qNXQ1bmpiaGsifQ.tCkudl7SJNzzHCARPEzC9w';

let appData = null;
let currentDayIndex = -1;
let map = null;
let mapMarkers = [];
let activeTrip = null;
let currentPage = 'home';

// Initialize app
async function init() {
    try {
        const response = await fetch('data/routes.json');
        appData = await response.json();
        renderApp();
    } catch (error) {
        console.error('Failed to load data:', error);
        document.body.innerHTML = '<div style="padding:100px 40px;text-align:center;color:#fff;"><h2>Failed to load route data</h2><p style="color:#888;margin-top:12px;">Please ensure routes.json exists in the data folder.</p></div>';
    }
}

// Render all app components
function renderApp() {
    const stats = appData.stats;
    document.getElementById('navEarnings').textContent = '$' + Math.round(stats.total_earnings).toLocaleString();
    document.getElementById('navTripCount').textContent = stats.total_trips.toLocaleString();
    renderHomePage();
    renderRoutesPage();
    renderReportsPage();
}

// Render home page
function renderHomePage() {
    const stats = appData.stats;
    document.getElementById('homeEarnings').textContent = '$' + Math.round(stats.total_earnings).toLocaleString();
    document.getElementById('homeTrips').textContent = stats.total_trips.toLocaleString();
    document.getElementById('homeDays').textContent = stats.total_days;

    const recentDays = appData.days.slice(-5).reverse();
    const container = document.getElementById('recentDays');
    container.innerHTML = recentDays.map((day, idx) => {
        const date = new Date(day.date + 'T12:00:00');
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const realIdx = appData.days.length - 1 - idx;
        return `
            <div class="recent-day-card" onclick="openDay(${realIdx})">
                <div class="recent-day-info">
                    <h4>${dateStr}</h4>
                    <span>${day.stats.trip_count} trips - ${day.stats.total_distance.toFixed(1)} mi</span>
                </div>
                <div class="recent-day-earnings">$${day.stats.total_earnings.toFixed(2)}</div>
            </div>
        `;
    }).join('');
}

// Render routes page
function renderRoutesPage() {
    renderDaysGrid();
}

// Render days grid
function renderDaysGrid() {
    const container = document.getElementById('daysGrid');
    const days = appData.days;
    const maxEarnings = Math.max(...days.map(d => d.stats.total_earnings));

    let currentMonth = '';
    let html = '';
    
    days.slice().reverse().forEach((day, idx) => {
        const date = new Date(day.date + 'T12:00:00');
        const month = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const monthLower = date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
        const weekdayFull = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

        if (month !== currentMonth) {
            currentMonth = month;
            html += `<div class="month-header" data-month="${monthLower}">${month}</div>`;
        }

        const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = date.getDate();
        const barWidth = (day.stats.total_earnings / maxEarnings) * 100;
        const realIdx = days.length - 1 - idx;

        // Build search data with full weekday names
        const searchData = [
            day.date,
            monthLower,
            weekday.toLowerCase(),
            weekdayFull,
            day.stats.total_earnings.toFixed(2),
            day.stats.trip_count + ' trips',
            day.stats.total_distance.toFixed(1) + ' miles'
        ].join(' ');

        html += `
            <div class="day-card" onclick="openDay(${realIdx})" data-search="${searchData}" data-month="${monthLower}" data-earnings="${day.stats.total_earnings}">
                <div class="day-date">
                    ${month.split(' ')[0]} ${dayNum}
                    <div class="weekday">${weekday}</div>
                </div>
                <div class="day-bar">
                    <div class="day-bar-fill" style="width: ${barWidth}%"></div>
                </div>
                <div class="day-stat trips">${day.stats.trip_count} trips</div>
                <div class="day-stat miles">${day.stats.total_distance.toFixed(1)} mi</div>
                <div class="day-stat earnings">$${day.stats.total_earnings.toFixed(2)}</div>
                <div class="day-stat tips">$${day.stats.total_tips.toFixed(2)}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Render reports page
function renderReportsPage() {
    const stats = appData.stats;
    const avgPerTrip = stats.total_trips > 0 ? stats.total_earnings / stats.total_trips : 0;

    document.getElementById('reportEarnings').textContent = '$' + stats.total_earnings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('reportTrips').textContent = stats.total_trips.toLocaleString();
    document.getElementById('reportMiles').textContent = Math.round(stats.total_distance).toLocaleString();
    document.getElementById('reportAvg').textContent = '$' + avgPerTrip.toFixed(2);
    document.getElementById('reportTips').textContent = '$' + stats.total_tips.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('reportDays').textContent = stats.total_days;

    renderMonthlyTable();
    renderTopDays();
    renderWeekdayChart();
}

// Render monthly breakdown table
function renderMonthlyTable() {
    const monthlyData = {};
    appData.days.forEach(day => {
        const date = new Date(day.date + 'T12:00:00');
        const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { earnings: 0, trips: 0, days: 0 };
        }
        monthlyData[monthKey].earnings += day.stats.total_earnings;
        monthlyData[monthKey].trips += day.stats.trip_count;
        monthlyData[monthKey].days += 1;
    });

    const container = document.getElementById('monthlyTable');
    const months = Object.entries(monthlyData).reverse();
    container.innerHTML = months.map(([month, data]) => {
        const avg = data.trips > 0 ? data.earnings / data.trips : 0;
        return `
            <div class="monthly-row">
                <div class="monthly-month">${month}</div>
                <div class="monthly-trips">${data.trips} trips</div>
                <div class="monthly-earnings">$${data.earnings.toFixed(2)}</div>
                <div class="monthly-avg">$${avg.toFixed(2)}/trip</div>
            </div>
        `;
    }).join('');
}

// Render top earning days
function renderTopDays() {
    const sortedDays = appData.days
        .map((day, idx) => ({ ...day, idx }))
        .sort((a, b) => b.stats.total_earnings - a.stats.total_earnings)
        .slice(0, 10);

    const container = document.getElementById('topDays');
    container.innerHTML = sortedDays.map((day, rank) => {
        const date = new Date(day.date + 'T12:00:00');
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return `
            <div class="top-day-row" onclick="openDay(${day.idx})">
                <div class="top-day-info">
                    <div class="top-day-rank">${rank + 1}</div>
                    <span class="top-day-date">${dateStr}</span>
                    <span class="top-day-trips">${day.stats.trip_count} trips</span>
                </div>
                <div class="top-day-earnings">$${day.stats.total_earnings.toFixed(2)}</div>
            </div>
        `;
    }).join('');
}

// Render weekday chart
function renderWeekdayChart() {
    const weekdayData = {
        'Sun': { earnings: 0, count: 0 },
        'Mon': { earnings: 0, count: 0 },
        'Tue': { earnings: 0, count: 0 },
        'Wed': { earnings: 0, count: 0 },
        'Thu': { earnings: 0, count: 0 },
        'Fri': { earnings: 0, count: 0 },
        'Sat': { earnings: 0, count: 0 }
    };

    appData.days.forEach(day => {
        const date = new Date(day.date + 'T12:00:00');
        const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
        weekdayData[weekday].earnings += day.stats.total_earnings;
        weekdayData[weekday].count += 1;
    });

    const maxEarnings = Math.max(...Object.values(weekdayData).map(d => d.earnings));
    const container = document.getElementById('weekdayChart');

    container.innerHTML = Object.entries(weekdayData).map(([day, data]) => {
        const height = maxEarnings > 0 ? (data.earnings / maxEarnings) * 100 : 0;
        return `
            <div class="weekday-bar">
                <div class="weekday-value">$${Math.round(data.earnings)}</div>
                <div class="weekday-bar-container">
                    <div class="weekday-bar-fill" style="height: ${height}%"></div>
                </div>
                <div class="weekday-label">${day}</div>
            </div>
        `;
    }).join('');
}

// Soft search - fuzzy matching with smart earnings filters
function smartSearch(query) {
    const q = query.toLowerCase().trim();

    // Clear active filter tags
    document.querySelectorAll('.search-tag').forEach(tag => {
        tag.classList.toggle('active', tag.dataset.filter === 'all' && !q);
    });

    if (!q) {
        document.querySelectorAll('.day-card, .month-header').forEach(el => {
            el.style.display = '';
        });
        return;
    }

    // Parse smart queries for earnings
    let minEarnings = 0;
    let maxEarnings = Infinity;
    let textQuery = q;

    // Match "over $100", "> 100", "100+", "above 100"
    const overMatch = q.match(/(?:over|above|>|more\s*than)\s*\$?(\d+)|\$?(\d+)\+/i);
    if (overMatch) {
        minEarnings = parseFloat(overMatch[1] || overMatch[2]);
        textQuery = q.replace(overMatch[0], '').trim();
    }

    // Match "under $100", "< 100", "below 100", "less than 100"
    const underMatch = q.match(/(?:under|below|<|less\s*than)\s*\$?(\d+)/i);
    if (underMatch) {
        maxEarnings = parseFloat(underMatch[1]);
        textQuery = q.replace(underMatch[0], '').trim();
    }

    // Match range "50-100" or "$50-$100"
    const rangeMatch = q.match(/\$?(\d+)\s*[-to]+\s*\$?(\d+)/i);
    if (rangeMatch) {
        minEarnings = parseFloat(rangeMatch[1]);
        maxEarnings = parseFloat(rangeMatch[2]);
        textQuery = q.replace(rangeMatch[0], '').trim();
    }

    // Split text query into tokens for soft matching
    const tokens = textQuery.split(/\s+/).filter(t => t.length > 0);

    let visibleMonths = new Set();

    document.querySelectorAll('.day-card').forEach(card => {
        const searchText = card.dataset.search || '';
        const earnings = parseFloat(card.dataset.earnings) || 0;
        const month = card.dataset.month;

        // Soft match: all tokens must be found
        const matchesText = tokens.length === 0 || tokens.every(token => {
            // Direct match
            if (searchText.includes(token)) return true;
            
            // Abbreviation expansion
            const abbrevMap = {
                'mon': 'monday', 'tue': 'tuesday', 'wed': 'wednesday',
                'thu': 'thursday', 'fri': 'friday', 'sat': 'saturday', 'sun': 'sunday',
                'jan': 'january', 'feb': 'february', 'mar': 'march', 'apr': 'april',
                'jun': 'june', 'jul': 'july', 'aug': 'august', 'sep': 'september',
                'oct': 'october', 'nov': 'november', 'dec': 'december'
            };
            const expanded = abbrevMap[token];
            if (expanded && searchText.includes(expanded)) return true;
            
            // Prefix match on words
            const words = searchText.split(/\s+/);
            return words.some(word => word.startsWith(token));
        });

        const matchesEarnings = earnings >= minEarnings && earnings <= maxEarnings;
        const show = matchesText && matchesEarnings;
        card.style.display = show ? '' : 'none';

        if (show && month) {
            visibleMonths.add(month);
        }
    });

    // Show/hide month headers
    document.querySelectorAll('.month-header').forEach(header => {
        const month = header.dataset.month;
        header.style.display = visibleMonths.has(month) ? '' : 'none';
    });
}

// Filter by month (tag click)
function filterByMonth(month) {
    document.querySelectorAll('.search-tag').forEach(tag => {
        tag.classList.toggle('active', tag.dataset.filter === month);
    });
    document.getElementById('routeSearch').value = '';

    if (month === 'all') {
        document.querySelectorAll('.day-card, .month-header').forEach(el => {
            el.style.display = '';
        });
        return;
    }

    document.querySelectorAll('.day-card').forEach(card => {
        card.style.display = card.dataset.month === month ? '' : 'none';
    });
    document.querySelectorAll('.month-header').forEach(header => {
        header.style.display = header.dataset.month === month ? '' : 'none';
    });
}

// Page navigation
function showPage(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('mapView').classList.remove('active');

    if (page === 'home') document.getElementById('pageHome').classList.add('active');
    else if (page === 'routes') document.getElementById('pageRoutes').classList.add('active');
    else if (page === 'reports') document.getElementById('pageReports').classList.add('active');
    
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById('nav' + page.charAt(0).toUpperCase() + page.slice(1)).classList.add('active');

    if (map) { map.remove(); map = null; }
    mapMarkers = [];
    activeTrip = null;
}

// Open day map
function openDay(dayIndex) {
    currentDayIndex = dayIndex;
    const day = appData.days[dayIndex];

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('mapView').classList.add('active');

    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById('navRoutes').classList.add('active');

    renderMapView(day);
}

// Navigate days
function navigateDay(direction) {
    const newIndex = currentDayIndex + direction;
    if (newIndex >= 0 && newIndex < appData.days.length) {
        if (map) { map.remove(); map = null; }
        mapMarkers = [];
        activeTrip = null;
        openDay(newIndex);
    }
}

// Render map view
function renderMapView(day) {
    const date = new Date(day.date + 'T12:00:00');
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    document.getElementById('mapDate').textContent = dateStr;
    document.getElementById('prevBtn').disabled = currentDayIndex <= 0;
    document.getElementById('nextBtn').disabled = currentDayIndex >= appData.days.length - 1;

    document.getElementById('dayEarnings').textContent = '$' + day.stats.total_earnings.toFixed(2);
    document.getElementById('dayTrips').textContent = day.stats.trip_count;
    document.getElementById('dayMiles').textContent = day.stats.total_distance.toFixed(1) + ' mi';
    document.getElementById('dayTips').textContent = '$' + day.stats.total_tips.toFixed(2);

    const trips = day.trips;
    if (trips.length > 0) {
        document.getElementById('dayStart').textContent = trips[0].request_time;
        document.getElementById('dayEnd').textContent = trips[trips.length - 1].dropoff_time;
    }

    renderTripCards(trips);
    initMap(trips);
}

// Render trip cards
function renderTripCards(trips) {
    const container = document.getElementById('tripList');
    container.innerHTML = trips.map((t, i) => `
        <div class="trip-card" data-trip-id="${i}" data-search="${t.restaurant.toLowerCase()} ${t.pickup_address.toLowerCase()} ${t.dropoff_address.toLowerCase()}" onclick="selectTrip(${i})">
            <div class="trip-header">
                <div class="trip-number">${i + 1}</div>
                <div class="trip-restaurant">${t.restaurant}</div>
                <div class="trip-earnings">${t.total_pay > 0 ? '$' + t.total_pay.toFixed(2) : '-'}</div>
            </div>
            <div class="trip-meta">
                <div class="trip-meta-item"><span class="icon">T</span> ${t.request_time}</div>
                <div class="trip-meta-item"><span class="icon">D</span> ${t.duration}</div>
                <div class="trip-meta-item"><span class="icon">M</span> ${t.distance.toFixed(1)} mi</div>
            </div>
            <div class="trip-pay-breakdown">
                ${t.base_fare > 0 ? `<span class="pay-item base">Base: $${t.base_fare.toFixed(2)}</span>` : ''}
                ${t.tip > 0 ? `<span class="pay-item tip">Tip: $${t.tip.toFixed(2)}</span>` : ''}
                ${t.incentive > 0 ? `<span class="pay-item promo">+$${t.incentive.toFixed(2)}</span>` : ''}
                ${t.order_refund > 0 ? `<span class="pay-item refund">Refund: $${t.order_refund.toFixed(2)}</span>` : ''}
            </div>
            <div class="trip-addresses">
                <div class="trip-addr">
                    <div class="trip-addr-icon pickup">P</div>
                    <span>${t.pickup_address.substring(0, 45)}${t.pickup_address.length > 45 ? '...' : ''}</span>
                </div>
                <div class="trip-addr">
                    <div class="trip-addr-icon dropoff">D</div>
                    <span>${t.dropoff_address.substring(0, 45)}${t.dropoff_address.length > 45 ? '...' : ''}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Initialize map
function initMap(trips) {
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const coords = [];
    trips.forEach(t => {
        if (t.pickup_coords) coords.push(t.pickup_coords);
        if (t.dropoff_coords) coords.push(t.dropoff_coords);
    });
    if (coords.length === 0) return;

    const centerLng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
    const centerLat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;

    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [centerLng, centerLat],
        zoom: 11
    });
    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

    map.on('load', () => {
        const lineCoords = [];
        trips.forEach(t => {
            if (t.pickup_coords) lineCoords.push(t.pickup_coords);
            if (t.dropoff_coords) lineCoords.push(t.dropoff_coords);
        });

        map.addSource('route', {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates: lineCoords } }
        });
        map.addLayer({
            id: 'route-line', type: 'line', source: 'route',
            paint: { 'line-color': '#4a9eff', 'line-width': 3, 'line-opacity': 0.6 }
        });

        let markerNum = 0;
        trips.forEach((t, tripId) => {
            if (t.pickup_coords) { markerNum++; addMarker(t.pickup_coords, 'pickup', markerNum, tripId); }
            if (t.dropoff_coords) { markerNum++; addMarker(t.dropoff_coords, 'dropoff', markerNum, tripId); }
        });

        const bounds = new mapboxgl.LngLatBounds();
        coords.forEach(c => bounds.extend(c));
        map.fitBounds(bounds, { padding: 60 });
    });
}

// Add marker
function addMarker(coords, type, number, tripId) {
    const el = document.createElement('div');
    el.className = `marker ${type}`;
    el.textContent = number;
    el.onclick = (e) => { e.stopPropagation(); selectTrip(tripId); };
    const marker = new mapboxgl.Marker(el).setLngLat(coords).addTo(map);
    mapMarkers.push({ marker, element: el, tripId });
}

// Select trip
function selectTrip(tripId) {
    activeTrip = tripId;
    const trip = appData.days[currentDayIndex].trips[tripId];

    document.querySelectorAll('.trip-card').forEach(card => {
        card.classList.toggle('active', parseInt(card.dataset.tripId) === tripId);
    });
    mapMarkers.forEach(m => { m.element.classList.toggle('highlight', m.tripId === tripId); });

    document.getElementById('detailNumber').textContent = tripId + 1;
    document.getElementById('detailEarnings').textContent = trip.total_pay > 0 ? '$' + trip.total_pay.toFixed(2) : '-';
    document.getElementById('detailDistance').textContent = trip.distance.toFixed(1) + ' mi';
    document.getElementById('detailDuration').textContent = trip.duration;
    document.getElementById('detailBase').textContent = trip.base_fare > 0 ? '$' + trip.base_fare.toFixed(2) : '-';
    document.getElementById('detailTip').textContent = trip.tip > 0 ? '$' + trip.tip.toFixed(2) : '-';
    document.getElementById('detailIncentive').textContent = (trip.incentive + trip.quest) > 0 ? '$' + (trip.incentive + trip.quest).toFixed(2) : '-';
    document.getElementById('detailRefund').textContent = trip.order_refund > 0 ? '$' + trip.order_refund.toFixed(2) : '-';
    document.getElementById('detailTime').textContent = trip.request_time + ' - ' + trip.dropoff_time;
    document.getElementById('detailPickup').textContent = trip.pickup_address;
    document.getElementById('detailDropoff').textContent = trip.dropoff_address;
    document.getElementById('tripDetail').classList.add('show');

    if (trip.pickup_coords && trip.dropoff_coords) {
        const bounds = new mapboxgl.LngLatBounds().extend(trip.pickup_coords).extend(trip.dropoff_coords);
        map.fitBounds(bounds, { padding: 100, maxZoom: 14 });
    } else if (trip.pickup_coords) {
        map.flyTo({ center: trip.pickup_coords, zoom: 14 });
    }
}

// Close detail panel
function closeDetail() {
    document.getElementById('tripDetail').classList.remove('show');
    activeTrip = null;
    document.querySelectorAll('.trip-card').forEach(card => card.classList.remove('active'));
    mapMarkers.forEach(m => m.element.classList.remove('highlight'));
}

// Filter trips in sidebar
function filterTrips(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('.trip-card').forEach(card => {
        const searchText = card.dataset.search || '';
        card.classList.toggle('hidden', q && !searchText.includes(q));
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

// ========== PRINT FUNCTIONS ==========

// Show print modal with content
function showPrintModal(content) {
    const modal = document.getElementById('printModal');
    const printContent = document.getElementById('printContent');
    
    printContent.innerHTML = `
        <button class="print-modal-close" onclick="closePrintModal()">&times;</button>
        ${content}
        <div class="print-modal-actions">
            <button class="btn-print" onclick="window.print()">Print</button>
            <button class="btn-close" onclick="closePrintModal()">Close</button>
        </div>
    `;
    
    modal.classList.add('show');
}

// Close print modal
function closePrintModal() {
    document.getElementById('printModal').classList.remove('show');
}

// Format currency
function formatCurrency(amount) {
    return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Get current date for reports
function getReportDate() {
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Print summary report
function printReport(type) {
    const stats = appData.stats;
    let content = '';
    
    if (type === 'summary') {
        content = generateSummaryReport(stats);
    } else if (type === 'monthly') {
        content = generateMonthlyReport();
    } else if (type === 'trips') {
        content = generateAllTripsReport();
    }
    
    showPrintModal(content);
}

// Generate summary report
function generateSummaryReport(stats) {
    const avgPerTrip = stats.total_trips > 0 ? stats.total_earnings / stats.total_trips : 0;
    const avgPerDay = stats.total_days > 0 ? stats.total_earnings / stats.total_days : 0;
    const avgPerMile = stats.total_distance > 0 ? stats.total_earnings / stats.total_distance : 0;
    
    return `
        <div class="print-document">
            <div class="print-header">
                <h1>COURIER ROUTES</h1>
                <p class="print-subtitle">Earnings Summary Report</p>
                <p class="print-date">Generated: ${getReportDate()}</p>
            </div>
            
            <div class="print-section">
                <h2>Executive Summary</h2>
                <div class="print-stats">
                    <div class="print-stat">
                        <div class="print-stat-value">${formatCurrency(stats.total_earnings)}</div>
                        <div class="print-stat-label">Total Earnings</div>
                    </div>
                    <div class="print-stat">
                        <div class="print-stat-value">${stats.total_trips.toLocaleString()}</div>
                        <div class="print-stat-label">Total Trips</div>
                    </div>
                    <div class="print-stat">
                        <div class="print-stat-value">${stats.total_days}</div>
                        <div class="print-stat-label">Active Days</div>
                    </div>
                </div>
            </div>
            
            <div class="print-section">
                <h2>Financial Breakdown</h2>
                <table class="print-table">
                    <tr><th>Category</th><th>Amount</th></tr>
                    <tr><td>Total Earnings</td><td class="number">${formatCurrency(stats.total_earnings)}</td></tr>
                    <tr><td>Total Tips</td><td class="number">${formatCurrency(stats.total_tips)}</td></tr>
                    <tr><td>Base Fares</td><td class="number">${formatCurrency(stats.total_earnings - stats.total_tips)}</td></tr>
                </table>
            </div>
            
            <div class="print-section">
                <h2>Performance Metrics</h2>
                <table class="print-table">
                    <tr><th>Metric</th><th>Value</th></tr>
                    <tr><td>Average per Trip</td><td class="number">${formatCurrency(avgPerTrip)}</td></tr>
                    <tr><td>Average per Day</td><td class="number">${formatCurrency(avgPerDay)}</td></tr>
                    <tr><td>Average per Mile</td><td class="number">${formatCurrency(avgPerMile)}</td></tr>
                    <tr><td>Total Distance</td><td class="number">${Math.round(stats.total_distance).toLocaleString()} miles</td></tr>
                </table>
            </div>
            
            <div class="print-footer">
                Courier Routes - ${getReportDate()}
            </div>
        </div>
    `;
}

// Generate monthly breakdown report
function generateMonthlyReport() {
    const monthlyData = {};
    
    appData.days.forEach(day => {
        const date = new Date(day.date + 'T12:00:00');
        const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { earnings: 0, trips: 0, tips: 0, distance: 0, days: 0 };
        }
        
        monthlyData[monthKey].earnings += day.stats.total_earnings;
        monthlyData[monthKey].trips += day.stats.trip_count;
        monthlyData[monthKey].tips += day.stats.total_tips;
        monthlyData[monthKey].distance += day.stats.total_distance;
        monthlyData[monthKey].days += 1;
    });
    
    const months = Object.entries(monthlyData).reverse();
    let totalEarnings = 0, totalTrips = 0, totalTips = 0, totalDistance = 0;
    
    let tableRows = months.map(([month, data]) => {
        totalEarnings += data.earnings;
        totalTrips += data.trips;
        totalTips += data.tips;
        totalDistance += data.distance;
        const avg = data.trips > 0 ? data.earnings / data.trips : 0;
        
        return `
            <tr>
                <td>${month}</td>
                <td class="number">${data.days}</td>
                <td class="number">${data.trips}</td>
                <td class="number">${Math.round(data.distance)}</td>
                <td class="number">${formatCurrency(data.tips)}</td>
                <td class="number">${formatCurrency(data.earnings)}</td>
                <td class="number">${formatCurrency(avg)}</td>
            </tr>
        `;
    }).join('');
    
    return `
        <div class="print-document">
            <div class="print-header">
                <h1>COURIER ROUTES</h1>
                <p class="print-subtitle">Monthly Breakdown Report</p>
                <p class="print-date">Generated: ${getReportDate()}</p>
            </div>
            
            <div class="print-section">
                <h2>Monthly Performance</h2>
                <table class="print-table">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Days</th>
                            <th>Trips</th>
                            <th>Miles</th>
                            <th>Tips</th>
                            <th>Earnings</th>
                            <th>Avg/Trip</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td><strong>TOTAL</strong></td>
                            <td class="number">${appData.stats.total_days}</td>
                            <td class="number">${totalTrips}</td>
                            <td class="number">${Math.round(totalDistance)}</td>
                            <td class="number">${formatCurrency(totalTips)}</td>
                            <td class="number">${formatCurrency(totalEarnings)}</td>
                            <td class="number">${formatCurrency(totalEarnings / totalTrips)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="print-footer">
                Courier Routes - ${getReportDate()}
            </div>
        </div>
    `;
}

// Generate all trips report
function generateAllTripsReport() {
    let tripRows = '';
    let tripNum = 0;
    
    appData.days.slice().reverse().forEach(day => {
        const date = new Date(day.date + 'T12:00:00');
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        day.trips.forEach(trip => {
            tripNum++;
            tripRows += `
                <tr class="no-break">
                    <td>${tripNum}</td>
                    <td>${dateStr}</td>
                    <td>${trip.request_time}</td>
                    <td>${trip.restaurant.substring(0, 25)}${trip.restaurant.length > 25 ? '...' : ''}</td>
                    <td class="number">${trip.distance.toFixed(1)}</td>
                    <td class="number">${formatCurrency(trip.base_fare)}</td>
                    <td class="number">${formatCurrency(trip.tip)}</td>
                    <td class="number">${formatCurrency(trip.total_pay)}</td>
                </tr>
            `;
        });
    });
    
    return `
        <div class="print-document">
            <div class="print-header">
                <h1>COURIER ROUTES</h1>
                <p class="print-subtitle">Complete Trip Log</p>
                <p class="print-date">Generated: ${getReportDate()}</p>
            </div>
            
            <div class="print-section">
                <h2>All Trips (${appData.stats.total_trips} total)</h2>
                <table class="print-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Restaurant</th>
                            <th>Miles</th>
                            <th>Fare</th>
                            <th>Tip</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tripRows}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4"><strong>TOTALS</strong></td>
                            <td class="number">${Math.round(appData.stats.total_distance)}</td>
                            <td class="number">${formatCurrency(appData.stats.total_earnings - appData.stats.total_tips)}</td>
                            <td class="number">${formatCurrency(appData.stats.total_tips)}</td>
                            <td class="number">${formatCurrency(appData.stats.total_earnings)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="print-footer">
                Courier Routes - ${getReportDate()}
            </div>
        </div>
    `;
}

// Print single day report
function printDayReport() {
    if (currentDayIndex < 0) return;
    
    const day = appData.days[currentDayIndex];
    const date = new Date(day.date + 'T12:00:00');
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    
    let tripRows = day.trips.map((trip, i) => `
        <tr class="no-break">
            <td>${i + 1}</td>
            <td>${trip.request_time}</td>
            <td>${trip.restaurant.substring(0, 30)}${trip.restaurant.length > 30 ? '...' : ''}</td>
            <td class="number">${trip.distance.toFixed(1)}</td>
            <td class="number">${formatCurrency(trip.base_fare)}</td>
            <td class="number">${formatCurrency(trip.tip)}</td>
            <td class="number">${formatCurrency(trip.total_pay)}</td>
        </tr>
    `).join('');
    
    const content = `
        <div class="print-document">
            <div class="print-header">
                <h1>DAILY ROUTE REPORT</h1>
                <p class="print-subtitle">${dateStr}</p>
                <p class="print-date">Generated: ${getReportDate()}</p>
            </div>
            
            <div class="print-section">
                <h2>Day Summary</h2>
                <div class="print-stats">
                    <div class="print-stat">
                        <div class="print-stat-value">${formatCurrency(day.stats.total_earnings)}</div>
                        <div class="print-stat-label">Earnings</div>
                    </div>
                    <div class="print-stat">
                        <div class="print-stat-value">${day.stats.trip_count}</div>
                        <div class="print-stat-label">Trips</div>
                    </div>
                    <div class="print-stat">
                        <div class="print-stat-value">${day.stats.total_distance.toFixed(1)} mi</div>
                        <div class="print-stat-label">Distance</div>
                    </div>
                </div>
            </div>
            
            <div class="print-section">
                <h2>Trip Details</h2>
                <table class="print-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Time</th>
                            <th>Restaurant</th>
                            <th>Miles</th>
                            <th>Fare</th>
                            <th>Tip</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tripRows}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3"><strong>TOTALS</strong></td>
                            <td class="number">${day.stats.total_distance.toFixed(1)}</td>
                            <td class="number">${formatCurrency(day.stats.total_earnings - day.stats.total_tips)}</td>
                            <td class="number">${formatCurrency(day.stats.total_tips)}</td>
                            <td class="number">${formatCurrency(day.stats.total_earnings)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="print-footer">
                Courier Routes - ${getReportDate()}
            </div>
        </div>
    `;
    
    showPrintModal(content);
}

// Print trip ticket
function printTripTicket() {
    if (activeTrip === null || currentDayIndex < 0) return;
    
    const trip = appData.days[currentDayIndex].trips[activeTrip];
    const day = appData.days[currentDayIndex];
    const date = new Date(day.date + 'T12:00:00');
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    const content = `
        <div class="print-document">
            <div class="print-ticket">
                <div class="print-ticket-header">
                    <h2>DELIVERY RECEIPT</h2>
                    <div class="ticket-number">Trip #${activeTrip + 1} - ${dateStr}</div>
                </div>
                
                <div class="print-ticket-row">
                    <span class="print-ticket-label">Restaurant</span>
                    <span class="print-ticket-value">${trip.restaurant}</span>
                </div>
                
                <div class="print-ticket-row">
                    <span class="print-ticket-label">Time</span>
                    <span class="print-ticket-value">${trip.request_time} - ${trip.dropoff_time}</span>
                </div>
                
                <div class="print-ticket-row">
                    <span class="print-ticket-label">Duration</span>
                    <span class="print-ticket-value">${trip.duration}</span>
                </div>
                
                <div class="print-ticket-row">
                    <span class="print-ticket-label">Distance</span>
                    <span class="print-ticket-value">${trip.distance.toFixed(1)} miles</span>
                </div>
                
                <div class="print-ticket-address">
                    <div class="addr-label">Pickup</div>
                    <div>${trip.pickup_address}</div>
                </div>
                
                <div class="print-ticket-address">
                    <div class="addr-label">Drop-off</div>
                    <div>${trip.dropoff_address}</div>
                </div>
                
                <div style="margin-top: 15px; border-top: 1px dashed #999; padding-top: 10px;">
                    <div class="print-ticket-row">
                        <span class="print-ticket-label">Base Fare</span>
                        <span class="print-ticket-value">${formatCurrency(trip.base_fare)}</span>
                    </div>
                    ${trip.tip > 0 ? `
                    <div class="print-ticket-row">
                        <span class="print-ticket-label">Tip</span>
                        <span class="print-ticket-value">${formatCurrency(trip.tip)}</span>
                    </div>
                    ` : ''}
                    ${trip.incentive > 0 ? `
                    <div class="print-ticket-row">
                        <span class="print-ticket-label">Incentive</span>
                        <span class="print-ticket-value">${formatCurrency(trip.incentive)}</span>
                    </div>
                    ` : ''}
                    ${trip.order_refund > 0 ? `
                    <div class="print-ticket-row">
                        <span class="print-ticket-label">Refund</span>
                        <span class="print-ticket-value">${formatCurrency(trip.order_refund)}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="print-ticket-total">
                    TOTAL: ${formatCurrency(trip.total_pay)}
                </div>
            </div>
        </div>
    `;
    
    showPrintModal(content);
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closePrintModal();
    }
});