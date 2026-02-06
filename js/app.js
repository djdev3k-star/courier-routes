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
    
    // Nav stats
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
    
    // Render recent days (last 5)
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
                    <span>${day.stats.trip_count} trips · ${day.stats.total_distance.toFixed(1)} mi</span>
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
        
        if (month !== currentMonth) {
            currentMonth = month;
            html += `<div class="month-header" data-month="${monthLower}">${month}</div>`;
        }
        
        const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = date.getDate();
        const barWidth = (day.stats.total_earnings / maxEarnings) * 100;
        const realIdx = days.length - 1 - idx;
        
        // Build search data
        const searchData = [
            day.date,
            monthLower,
            weekday.toLowerCase(),
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
        const avg = data.count > 0 ? data.earnings / data.count : 0;
        
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

// Smart search
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
    
    // Parse smart queries
    let minEarnings = 0;
    let maxEarnings = Infinity;
    let textQuery = q;
    
    // Match "over $100" or "> 100"
    const overMatch = q.match(/(?:over|above|>)\s*\$?(\d+)/i);
    if (overMatch) {
        minEarnings = parseFloat(overMatch[1]);
        textQuery = q.replace(overMatch[0], '').trim();
    }
    
    // Match "under $100" or "< 100"
    const underMatch = q.match(/(?:under|below|<)\s*\$?(\d+)/i);
    if (underMatch) {
        maxEarnings = parseFloat(underMatch[1]);
        textQuery = q.replace(underMatch[0], '').trim();
    }
    
    let visibleMonths = new Set();
    
    document.querySelectorAll('.day-card').forEach(card => {
        const searchText = card.dataset.search || '';
        const earnings = parseFloat(card.dataset.earnings) || 0;
        const month = card.dataset.month;
        
        const matchesText = !textQuery || searchText.includes(textQuery);
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
    // Update active tag
    document.querySelectorAll('.search-tag').forEach(tag => {
        tag.classList.toggle('active', tag.dataset.filter === month);
    });
    
    // Clear search input
    document.getElementById('routeSearch').value = '';
    
    if (month === 'all') {
        document.querySelectorAll('.day-card, .month-header').forEach(el => {
            el.style.display = '';
        });
        return;
    }
    
    document.querySelectorAll('.day-card').forEach(card => {
        const cardMonth = card.dataset.month;
        card.style.display = cardMonth === month ? '' : 'none';
    });
    
    document.querySelectorAll('.month-header').forEach(header => {
        const headerMonth = header.dataset.month;
        header.style.display = headerMonth === month ? '' : 'none';
    });
}

// Page navigation
function showPage(page) {
    currentPage = page;
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('mapView').classList.remove('active');
    
    // Show target page
    if (page === 'home') {
        document.getElementById('pageHome').classList.add('active');
    } else if (page === 'routes') {
        document.getElementById('pageRoutes').classList.add('active');
    } else if (page === 'reports') {
        document.getElementById('pageReports').classList.add('active');
    }
    
    // Update nav
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById('nav' + page.charAt(0).toUpperCase() + page.slice(1)).classList.add('active');
    
    // Cleanup map if leaving map view
    if (map) {
        map.remove();
        map = null;
    }
    mapMarkers = [];
    activeTrip = null;
}

// Open day map
function openDay(dayIndex) {
    currentDayIndex = dayIndex;
    const day = appData.days[dayIndex];
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('mapView').classList.add('active');
    
    // Update nav to routes
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById('navRoutes').classList.add('active');
    
    renderMapView(day);
}

// Navigate days
function navigateDay(direction) {
    const newIndex = currentDayIndex + direction;
    if (newIndex >= 0 && newIndex < appData.days.length) {
        if (map) {
            map.remove();
            map = null;
        }
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
            data: {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: lineCoords
                }
            }
        });
        
        map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            paint: {
                'line-color': '#4a9eff',
                'line-width': 3,
                'line-opacity': 0.6
            }
        });
        
        let markerNum = 0;
        trips.forEach((t, tripId) => {
            if (t.pickup_coords) {
                markerNum++;
                addMarker(t.pickup_coords, 'pickup', markerNum, tripId);
            }
            if (t.dropoff_coords) {
                markerNum++;
                addMarker(t.dropoff_coords, 'dropoff', markerNum, tripId);
            }
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
    el.onclick = (e) => {
        e.stopPropagation();
        selectTrip(tripId);
    };
    
    const marker = new mapboxgl.Marker(el)
        .setLngLat(coords)
        .addTo(map);
    
    mapMarkers.push({ marker, element: el, tripId });
}

// Select trip
function selectTrip(tripId) {
    activeTrip = tripId;
    const trip = appData.days[currentDayIndex].trips[tripId];
    
    document.querySelectorAll('.trip-card').forEach(card => {
        card.classList.toggle('active', parseInt(card.dataset.tripId) === tripId);
    });
    
    mapMarkers.forEach(m => {
        m.element.classList.toggle('highlight', m.tripId === tripId);
    });
    
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
        const bounds = new mapboxgl.LngLatBounds()
            .extend(trip.pickup_coords)
            .extend(trip.dropoff_coords);
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
