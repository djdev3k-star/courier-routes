// Courier Routes App
const MAPBOX_TOKEN = 'pk.eyJ1IjoibXBieDE1IiwiYSI6ImNta2Y1a3dxZzAzZ3AzZ29qNXQ1bmpiaGsifQ.tCkudl7SJNzzHCARPEzC9w';

let appData = null;
let currentDayIndex = -1;
let map = null;
let mapMarkers = [];
let activeTrip = null;

// Initialize app
async function init() {
    try {
        const response = await fetch('data/routes.json');
        appData = await response.json();
        renderSplash();
    } catch (error) {
        console.error('Failed to load data:', error);
        document.body.innerHTML = '<div style="padding:40px;text-align:center;color:#fff;">Failed to load route data. Please ensure routes.json exists.</div>';
    }
}

// Render splash page
function renderSplash() {
    const stats = appData.stats;
    const avgPerTrip = stats.total_trips > 0 ? stats.total_earnings / stats.total_trips : 0;
    
    document.getElementById('statEarnings').textContent = '$' + stats.total_earnings.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('statTrips').textContent = stats.total_trips.toLocaleString();
    document.getElementById('statMiles').textContent = Math.round(stats.total_distance).toLocaleString();
    document.getElementById('statAvg').textContent = '$' + avgPerTrip.toFixed(2);
    document.getElementById('statTips').textContent = '$' + stats.total_tips.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    
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
        
        if (month !== currentMonth) {
            currentMonth = month;
            html += `<div class="month-header">${month}</div>`;
        }
        
        const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = date.getDate();
        const barWidth = (day.stats.total_earnings / maxEarnings) * 100;
        const realIdx = days.length - 1 - idx;
        
        html += `
            <div class="day-card" onclick="openDay(${realIdx})" data-search="${day.date} ${month.toLowerCase()}">
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

// Search filter
function filterDays(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('.day-card').forEach(card => {
        const searchText = card.dataset.search || '';
        card.style.display = !q || searchText.includes(q) ? '' : 'none';
    });
}

// Open day map
function openDay(dayIndex) {
    currentDayIndex = dayIndex;
    const day = appData.days[dayIndex];
    
    document.querySelector('.splash').classList.add('hidden');
    document.querySelector('.map-view').classList.add('active');
    
    renderMapView(day);
}

// Back to splash
function goBack() {
    document.querySelector('.splash').classList.remove('hidden');
    document.querySelector('.map-view').classList.remove('active');
    
    if (map) {
        map.remove();
        map = null;
    }
    mapMarkers = [];
    activeTrip = null;
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
    
    // Update header
    document.getElementById('mapDate').textContent = dateStr;
    
    // Update nav buttons
    document.getElementById('prevBtn').disabled = currentDayIndex <= 0;
    document.getElementById('nextBtn').disabled = currentDayIndex >= appData.days.length - 1;
    
    // Update stats bar
    document.getElementById('dayEarnings').textContent = '$' + day.stats.total_earnings.toFixed(2);
    document.getElementById('dayTrips').textContent = day.stats.trip_count;
    document.getElementById('dayMiles').textContent = day.stats.total_distance.toFixed(1) + ' mi';
    document.getElementById('dayTips').textContent = '$' + day.stats.total_tips.toFixed(2);
    
    const trips = day.trips;
    if (trips.length > 0) {
        document.getElementById('dayStart').textContent = trips[0].request_time;
        document.getElementById('dayEnd').textContent = trips[trips.length - 1].dropoff_time;
    }
    
    // Render trip cards
    renderTripCards(trips);
    
    // Initialize map
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
    
    // Collect coordinates
    const coords = [];
    trips.forEach(t => {
        if (t.pickup_coords) coords.push(t.pickup_coords);
        if (t.dropoff_coords) coords.push(t.dropoff_coords);
    });
    
    if (coords.length === 0) return;
    
    // Calculate center
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
        // Build route line
        const lineCoords = [];
        trips.forEach(t => {
            if (t.pickup_coords) lineCoords.push(t.pickup_coords);
            if (t.dropoff_coords) lineCoords.push(t.dropoff_coords);
        });
        
        // Add route line
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
        
        // Add markers
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
        
        // Fit bounds
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
    
    // Update card states
    document.querySelectorAll('.trip-card').forEach(card => {
        card.classList.toggle('active', parseInt(card.dataset.tripId) === tripId);
    });
    
    // Highlight markers
    mapMarkers.forEach(m => {
        m.element.classList.toggle('highlight', m.tripId === tripId);
    });
    
    // Update detail panel
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
    
    // Fly to trip
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

// Filter trips
function filterTrips(query) {
    const q = query.toLowerCase();
    document.querySelectorAll('.trip-card').forEach(card => {
        const searchText = card.dataset.search || '';
        card.classList.toggle('hidden', q && !searchText.includes(q));
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
