// Courier Routes App
const MAPBOX_TOKEN = 'pk.eyJ1IjoibXBieDE1IiwiYSI6ImNta2Y1a3dxZzAzZ3AzZ29qNXQ1bmpiaGsifQ.tCkudl7SJNzzHCARPEzC9w';

let appData = null;
let currentDayIndex = -1;
let map = null;
let mapMarkers = [];
let activeTrip = null;
let currentPage = 'home';
let currentWeekStart = null; // For week navigation
let weekViewActive = false;

// HTML escape helper for XSS protection
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Safe localStorage helper
function safeGetJSON(key, defaultValue = null) {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
        console.warn(`Failed to parse localStorage key ${key}:`, e);
        return defaultValue;
    }
}

// Go back in history, or to a fallback page
function goBack(fallbackPage = 'home') {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        showPage(fallbackPage);
    }
}

// Initialize app
async function init() {
    try {
        const response = await fetch('data/routes.json');
        appData = await response.json();
        
        // Load any manually entered offline trips
        loadOfflineTrips();
        
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
    initWeekNavigation();
}

// Render home page
function renderHomePage() {
    const stats = appData.stats;
    const days = appData.days;
    
    // Hero social proof stats
    const heroTrips = document.getElementById('heroTrips');
    const heroMiles = document.getElementById('heroMiles');
    const heroEarnings = document.getElementById('heroEarnings');
    if (heroTrips) heroTrips.textContent = stats.total_trips.toLocaleString();
    if (heroMiles) heroMiles.textContent = Math.round(stats.total_distance).toLocaleString();
    if (heroEarnings) heroEarnings.textContent = '$' + Math.round(stats.total_earnings).toLocaleString();
    
    // Dashboard preview stats
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayData = days.find(d => d.date === todayStr);
    const previewToday = document.getElementById('previewToday');
    if (previewToday) {
        previewToday.textContent = todayData ? '$' + todayData.stats.total_earnings.toFixed(2) : '$0.00';
    }
    
    // This week earnings for preview
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const weekEarnings = days.filter(day => {
        const d = new Date(day.date + 'T12:00:00');
        return d >= startOfWeek;
    }).reduce((sum, d) => sum + d.stats.total_earnings, 0);
    const previewWeek = document.getElementById('previewWeek');
    if (previewWeek) previewWeek.textContent = '$' + weekEarnings.toFixed(2);
    
    // Mini chart in preview (last 7 days)
    const previewChart = document.getElementById('previewChart');
    if (previewChart) {
        const last7 = days.slice(-7);
        const maxDay = Math.max(...last7.map(d => d.stats.total_earnings), 1);
        previewChart.innerHTML = last7.map(day => {
            const height = (day.stats.total_earnings / maxDay) * 100;
            return `<div class="preview-bar" style="height: ${Math.max(height, 5)}%"></div>`;
        }).join('');
    }
    
    // Quick stats
    const bestDay = [...days].sort((a, b) => b.stats.total_earnings - a.stats.total_earnings)[0];
    const avgPerTrip = stats.total_trips > 0 ? stats.total_earnings / stats.total_trips : 0;
    const tipRate = stats.total_earnings > 0 ? (stats.total_tips / stats.total_earnings) * 100 : 0;
    
    const quickBestDay = document.getElementById('quickBestDay');
    const quickAvgTrip = document.getElementById('quickAvgTrip');
    const quickTotalDays = document.getElementById('quickTotalDays');
    const quickTipRate = document.getElementById('quickTipRate');
    
    if (quickBestDay && bestDay) quickBestDay.textContent = '$' + bestDay.stats.total_earnings.toFixed(2);
    if (quickAvgTrip) quickAvgTrip.textContent = '$' + avgPerTrip.toFixed(2);
    if (quickTotalDays) quickTotalDays.textContent = stats.total_days;
    if (quickTipRate) quickTipRate.textContent = tipRate.toFixed(0) + '%';

    // Recent days
    const recentDays = days.slice(-5).reverse();
    const container = document.getElementById('recentDays');
    if (container) {
        container.innerHTML = recentDays.map((day, idx) => {
            const date = new Date(day.date + 'T12:00:00');
            const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const realIdx = days.length - 1 - idx;
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

        // Build search data with full weekday names and restaurant/address info
        const tripSearchData = day.trips.map(t => {
            const parts = [t.restaurant || ''];
            // Extract city from addresses
            if (t.pickup_address) {
                const cityMatch = t.pickup_address.match(/,\s*([^,]+),\s*TX/i);
                if (cityMatch) parts.push(cityMatch[1]);
            }
            if (t.dropoff_address) {
                const cityMatch = t.dropoff_address.match(/,\s*([^,]+),\s*TX/i);
                if (cityMatch) parts.push(cityMatch[1]);
                // Also include street names
                const streetMatch = t.dropoff_address.match(/^([^,]+)/);
                if (streetMatch) parts.push(streetMatch[1]);
            }
            return parts.join(' ');
        }).join(' ');
        
        const searchData = [
            day.date,
            monthLower,
            weekday.toLowerCase(),
            weekdayFull,
            day.stats.total_earnings.toFixed(2),
            day.stats.trip_count + ' trips',
            day.stats.total_distance.toFixed(1) + ' miles',
            tripSearchData
        ].join(' ').toLowerCase();

        html += `
            <div class="day-card" onclick="openDay(${realIdx})" data-search="${searchData}" data-month="${monthLower}" data-earnings="${day.stats.total_earnings}" data-date="${day.date}">
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

// Render stats page
function renderStatsPage() {
    const stats = appData.stats;
    const days = appData.days;
    
    // Calculate total hours (estimate: ~15 min per trip average)
    const totalHours = stats.total_trips * 0.25;
    
    // Averages
    const avgPerTrip = stats.total_trips > 0 ? stats.total_earnings / stats.total_trips : 0;
    const avgPerHour = totalHours > 0 ? stats.total_earnings / totalHours : 0;
    const avgPerMile = stats.total_distance > 0 ? stats.total_earnings / stats.total_distance : 0;
    const avgPerDay = stats.total_days > 0 ? stats.total_earnings / stats.total_days : 0;
    const tipRate = stats.total_earnings > 0 ? (stats.total_tips / stats.total_earnings) * 100 : 0;
    
    document.getElementById('statsAvgTrip').textContent = '$' + avgPerTrip.toFixed(2);
    document.getElementById('statsAvgHour').textContent = '$' + avgPerHour.toFixed(2);
    document.getElementById('statsAvgMile').textContent = '$' + avgPerMile.toFixed(2);
    document.getElementById('statsAvgDay').textContent = '$' + avgPerDay.toFixed(2);
    document.getElementById('statsTips').textContent = '$' + stats.total_tips.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('statsTipRate').textContent = tipRate.toFixed(0) + '%';
    
    // This week stats
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const thisWeekDays = days.filter(day => {
        const d = new Date(day.date + 'T12:00:00');
        return d >= startOfWeek && d <= endOfWeek;
    });
    
    const weekEarnings = thisWeekDays.reduce((sum, d) => sum + d.stats.total_earnings, 0);
    const weekTrips = thisWeekDays.reduce((sum, d) => sum + d.stats.trip_count, 0);
    const weekMiles = thisWeekDays.reduce((sum, d) => sum + d.stats.total_distance, 0);
    const weekHours = weekTrips * 0.25;
    const weekGoal = 500; // Weekly goal
    const weekProgress = Math.min((weekEarnings / weekGoal) * 100, 100);
    const weekPerHour = weekHours > 0 ? weekEarnings / weekHours : 0;
    
    // Week date range
    const weekRangeStr = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + 
        ' - ' + endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    document.getElementById('statsWeekRange').textContent = weekRangeStr;
    
    document.getElementById('statsWeekEarnings').textContent = '$' + weekEarnings.toFixed(2);
    document.getElementById('statsWeekTrips').textContent = weekTrips;
    document.getElementById('statsWeekMiles').textContent = weekMiles.toFixed(1);
    document.getElementById('statsWeekHours').textContent = weekHours.toFixed(0) + 'h';
    document.getElementById('statsWeekPerHour').textContent = '$' + weekPerHour.toFixed(2);
    document.getElementById('statsWeekGoalFill').style.width = weekProgress + '%';
    document.getElementById('statsWeekGoalPercent').textContent = Math.round(weekProgress) + '%';
    
    // Best day insight
    const bestDay = [...days].sort((a, b) => b.stats.total_earnings - a.stats.total_earnings)[0];
    if (bestDay) {
        const bestDate = new Date(bestDay.date + 'T12:00:00');
        document.getElementById('statsBestDay').textContent = bestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        document.getElementById('statsBestDayDetail').textContent = '$' + bestDay.stats.total_earnings.toFixed(2) + ' earned';
    }
    
    // Top restaurant insight (from trip data)
    const restaurantCounts = {};
    days.forEach(day => {
        day.trips.forEach(trip => {
            const name = trip.restaurant || 'Unknown';
            restaurantCounts[name] = (restaurantCounts[name] || 0) + 1;
        });
    });
    const topRestaurant = Object.entries(restaurantCounts).sort((a, b) => b[1] - a[1])[0];
    if (topRestaurant) {
        document.getElementById('statsTopRestaurant').textContent = topRestaurant[0];
        document.getElementById('statsTopRestaurantDetail').textContent = topRestaurant[1] + ' pickups';
    }
    
    // Best hour insight
    const hourEarnings = {};
    days.forEach(day => {
        day.trips.forEach(trip => {
            if (trip.pickup_time) {
                const hour = parseInt(trip.pickup_time.split(':')[0]);
                hourEarnings[hour] = (hourEarnings[hour] || 0) + (trip.earnings || 0);
            }
        });
    });
    const bestHour = Object.entries(hourEarnings).sort((a, b) => b[1] - a[1])[0];
    if (bestHour) {
        const hour = parseInt(bestHour[0]);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        document.getElementById('statsBestHour').textContent = displayHour + ' ' + ampm;
        document.getElementById('statsBestHourDetail').textContent = '$' + bestHour[1].toFixed(0) + ' total';
    }
    
    // Best weekday insight
    const weekdayEarnings = {};
    days.forEach(day => {
        const date = new Date(day.date + 'T12:00:00');
        const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
        weekdayEarnings[weekday] = (weekdayEarnings[weekday] || 0) + day.stats.total_earnings;
    });
    const bestWeekday = Object.entries(weekdayEarnings).sort((a, b) => b[1] - a[1])[0];
    if (bestWeekday) {
        document.getElementById('statsBestWeekday').textContent = bestWeekday[0];
        document.getElementById('statsBestWeekdayDetail').textContent = '$' + bestWeekday[1].toFixed(0) + ' total';
    }
    
    // Tax preview (simplified estimates)
    const mileageDeduction = stats.total_distance * 0.67; // 2024 IRS rate
    const taxableIncome = Math.max(stats.total_earnings - mileageDeduction, 0);
    
    document.getElementById('statsTaxDeduction').textContent = '$' + mileageDeduction.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('statsTaxable').textContent = '$' + taxableIncome.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// Global search handler - routes to appropriate page and searches
function globalSearchHandler(query) {
    const q = query.trim();
    
    // If we're not on routes page and there's a query, go to routes
    if (q && currentPage !== 'routes') {
        showPage('routes');
    }
    
    // Apply the smart search
    smartSearch(q);
}

// Powerful search - fuzzy matching with smart earnings filters and restaurant/address search
function smartSearch(query) {
    const q = query.toLowerCase().trim();

    // Clear active filter tags
    document.querySelectorAll('.search-tag, .filter-tag').forEach(tag => {
        tag.classList.toggle('active', tag.dataset.filter === 'all' && !q);
    });

    if (!q) {
        document.querySelectorAll('.day-card, .month-header').forEach(el => {
            el.style.display = '';
        });
        updateSearchResultsCount(null);
        return;
    }

    // Parse smart queries for earnings
    let minEarnings = 0;
    let maxEarnings = Infinity;
    let minTrips = 0;
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
    
    // Match trip count filters: "5+ trips", "10 trips", "trips > 5"
    const tripsMatch = q.match(/(\d+)\+?\s*trips?|trips?\s*[>:]\s*(\d+)/i);
    if (tripsMatch) {
        minTrips = parseInt(tripsMatch[1] || tripsMatch[2]);
        textQuery = q.replace(tripsMatch[0], '').trim();
    }

    // Split text query into tokens for soft matching
    const tokens = textQuery.split(/\s+/).filter(t => t.length > 1); // min 2 chars

    let visibleMonths = new Set();
    let matchCount = 0;
    let totalEarnings = 0;

    document.querySelectorAll('.day-card').forEach(card => {
        const searchText = card.dataset.search || '';
        const earnings = parseFloat(card.dataset.earnings) || 0;
        const month = card.dataset.month;
        const tripCount = parseInt(searchText.match(/(\d+)\s*trips/)?.[1] || 0);

        // Soft match: all tokens must be found
        const matchesText = tokens.length === 0 || tokens.every(token => {
            // Direct substring match
            if (searchText.includes(token)) return true;
            
            // Abbreviation expansion for days and months
            const abbrevMap = {
                'mon': 'monday', 'tue': 'tuesday', 'wed': 'wednesday',
                'thu': 'thursday', 'fri': 'friday', 'sat': 'saturday', 'sun': 'sunday',
                'jan': 'january', 'feb': 'february', 'mar': 'march', 'apr': 'april',
                'jun': 'june', 'jul': 'july', 'aug': 'august', 'sep': 'september',
                'oct': 'october', 'nov': 'november', 'dec': 'december',
                'mcdonalds': "mcdonald's", 'mcd': "mcdonald's",
                'chilis': "chili's", 'wendys': "wendy's", 'arbys': "arby's",
                'popeyes': "popeye's", 'churchs': "church's"
            };
            const expanded = abbrevMap[token];
            if (expanded && searchText.includes(expanded)) return true;
            
            // Fuzzy match: allow 1 character difference for longer tokens
            if (token.length >= 4) {
                const words = searchText.split(/\s+/);
                return words.some(word => {
                    if (word.startsWith(token)) return true;
                    if (token.startsWith(word.substring(0, 3))) return true;
                    // Simple Levenshtein-like check for typos
                    if (Math.abs(word.length - token.length) <= 1) {
                        let diff = 0;
                        for (let i = 0; i < Math.min(word.length, token.length); i++) {
                            if (word[i] !== token[i]) diff++;
                        }
                        return diff <= 1;
                    }
                    return false;
                });
            }
            
            // Prefix match on words for short tokens
            const words = searchText.split(/\s+/);
            return words.some(word => word.startsWith(token));
        });

        const matchesEarnings = earnings >= minEarnings && earnings <= maxEarnings;
        const matchesTrips = tripCount >= minTrips;
        const show = matchesText && matchesEarnings && matchesTrips;
        card.style.display = show ? '' : 'none';

        if (show) {
            matchCount++;
            totalEarnings += earnings;
            if (month) visibleMonths.add(month);
        }
    });

    // Show/hide month headers
    document.querySelectorAll('.month-header').forEach(header => {
        const month = header.dataset.month;
        header.style.display = visibleMonths.has(month) ? '' : 'none';
    });
    
    // Update search results indicator
    updateSearchResultsCount(matchCount, totalEarnings);
}

// Show search results count in the UI
function updateSearchResultsCount(count, earnings) {
    let indicator = document.getElementById('searchResultsIndicator');
    
    if (count === null) {
        if (indicator) indicator.remove();
        return;
    }
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'searchResultsIndicator';
        indicator.className = 'search-results-indicator';
        const routesList = document.querySelector('.routes-list');
        if (routesList) {
            routesList.parentNode.insertBefore(indicator, routesList);
        }
    }
    
    if (count === 0) {
        indicator.innerHTML = '<span class="no-results">No matching days found</span>';
    } else {
        indicator.innerHTML = `<span class="results-count">${count} day${count !== 1 ? 's' : ''} found</span><span class="results-earnings">$${earnings.toFixed(2)} total</span>`;
    }
}

// Filter by month (tag click)
function filterByMonth(month) {
    // Update both old search-tag and new filter-tag classes
    document.querySelectorAll('.search-tag, .filter-tag').forEach(tag => {
        tag.classList.toggle('active', tag.dataset.filter === month);
    });
    
    // Clear both search inputs
    const routeSearch = document.getElementById('routeSearch');
    const globalSearch = document.getElementById('globalSearch');
    if (routeSearch) routeSearch.value = '';
    if (globalSearch) globalSearch.value = '';

    // Disable week view when using month filter
    weekViewActive = false;
    updateWeekNavDisplay();

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

// Week Navigation Functions
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getWeekEnd(weekStart) {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
}

function initWeekNavigation() {
    // Start with current week
    currentWeekStart = getWeekStart(new Date());
    updateWeekNavDisplay();
}

function navigateWeek(direction) {
    if (!currentWeekStart) {
        currentWeekStart = getWeekStart(new Date());
    }
    
    currentWeekStart.setDate(currentWeekStart.getDate() + (direction * 7));
    weekViewActive = true;
    
    // Clear month filter
    document.querySelectorAll('.search-tag').forEach(tag => {
        tag.classList.toggle('active', tag.dataset.filter === 'all');
    });
    
    filterByWeek();
    updateWeekNavDisplay();
}

function goToCurrentWeek() {
    currentWeekStart = getWeekStart(new Date());
    weekViewActive = true;
    
    // Clear month filter
    document.querySelectorAll('.search-tag').forEach(tag => {
        tag.classList.toggle('active', tag.dataset.filter === 'all');
    });
    
    filterByWeek();
    updateWeekNavDisplay();
}

function showAllDays() {
    weekViewActive = false;
    
    // Reset to all filter
    document.querySelectorAll('.search-tag').forEach(tag => {
        tag.classList.toggle('active', tag.dataset.filter === 'all');
    });
    
    document.querySelectorAll('.day-card, .month-header').forEach(el => {
        el.style.display = '';
    });
    
    updateWeekNavDisplay();
}

function filterByWeek() {
    if (!currentWeekStart || !appData) return;
    
    const weekEnd = getWeekEnd(currentWeekStart);
    
    // Hide month headers when in week view
    document.querySelectorAll('.month-header').forEach(header => {
        header.style.display = 'none';
    });
    
    document.querySelectorAll('.day-card').forEach(card => {
        const dateStr = card.getAttribute('data-date');
        if (!dateStr) {
            card.style.display = 'none';
            return;
        }
        
        const cardDate = new Date(dateStr + 'T12:00:00');
        const isInWeek = cardDate >= currentWeekStart && cardDate <= weekEnd;
        card.style.display = isInWeek ? '' : 'none';
    });
    
    updateWeekSummary();
}

function updateWeekNavDisplay() {
    const weekNavDates = document.getElementById('weekNavDates');
    const weekSummary = document.getElementById('weekSummary');
    
    if (!currentWeekStart) {
        currentWeekStart = getWeekStart(new Date());
    }
    
    const weekEnd = getWeekEnd(currentWeekStart);
    const startStr = currentWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (weekNavDates) {
        weekNavDates.textContent = `${startStr} - ${endStr}`;
    }
    
    // Show/hide week summary based on week view state
    if (weekSummary) {
        weekSummary.style.display = weekViewActive ? 'flex' : 'none';
    }
    
    // Update active state of week buttons
    const weekBtnTexts = document.querySelectorAll('.week-btn-text');
    weekBtnTexts.forEach(btn => {
        const isTodayBtn = btn.textContent.trim() === 'Today';
        const isAllBtn = btn.textContent.trim() === 'All';
        
        if (isTodayBtn) {
            btn.classList.toggle('active', weekViewActive && isCurrentWeek());
        }
        if (isAllBtn) {
            btn.classList.toggle('active', !weekViewActive);
        }
    });
    
    if (weekViewActive) {
        updateWeekSummary();
    }
}

function isCurrentWeek() {
    const today = getWeekStart(new Date());
    return currentWeekStart && 
           currentWeekStart.getTime() === today.getTime();
}

function updateWeekSummary() {
    if (!currentWeekStart || !appData) return;
    
    const weekEnd = getWeekEnd(currentWeekStart);
    
    let earnings = 0;
    let trips = 0;
    let miles = 0;
    let daysWorked = 0;
    
    appData.days.forEach(day => {
        const dayDate = new Date(day.date + 'T12:00:00');
        if (dayDate >= currentWeekStart && dayDate <= weekEnd) {
            earnings += day.stats.total_earnings;
            trips += day.stats.trip_count;
            miles += day.stats.total_distance;
            daysWorked++;
        }
    });
    
    document.getElementById('weekSummaryEarnings').textContent = '$' + earnings.toFixed(2);
    document.getElementById('weekSummaryTrips').textContent = trips;
    document.getElementById('weekSummaryMiles').textContent = miles.toFixed(1);
    document.getElementById('weekSummaryDays').textContent = daysWorked;
}

// Page navigation
function showPage(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('mapView').classList.remove('active');

    if (page === 'home') document.getElementById('pageHome').classList.add('active');
    else if (page === 'routes') document.getElementById('pageRoutes').classList.add('active');
    else if (page === 'reports') document.getElementById('pageReports').classList.add('active');
    else if (page === 'stats') {
        document.getElementById('pageStats').classList.add('active');
        renderStatsPage();
    }
    else if (page === 'feature-maps') document.getElementById('pageFeatureMaps').classList.add('active');
    else if (page === 'feature-earnings') document.getElementById('pageFeatureEarnings').classList.add('active');
    else if (page === 'feature-reports') document.getElementById('pageFeatureReports').classList.add('active');
    
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    const navEl = document.getElementById('nav' + page.charAt(0).toUpperCase() + page.slice(1));
    if (navEl) navEl.classList.add('active');

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
        zoom: 11,
        preserveDrawingBuffer: true // Enable for print/screenshot capture
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
    
    // Show UUID link if available
    const uuidSection = document.getElementById('detailUuidSection');
    const uuidLink = document.getElementById('detailUuidLink');
    if (trip.trip_uuid && trip.trip_uuid !== 'N/A') {
        uuidLink.href = `https://drivers.uber.com/earnings/trips/${trip.trip_uuid}`;
        uuidLink.textContent = trip.trip_uuid;
        uuidSection.style.display = '';
    } else {
        uuidSection.style.display = 'none';
    }
    
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

// Print content directly (no modal)
function printContent(content) {
    const printArea = document.getElementById('printArea');
    printArea.innerHTML = content;
    
    // Small delay to ensure content is rendered
    setTimeout(() => {
        window.print();
        // Clear print area after printing
        setTimeout(() => {
            printArea.innerHTML = '';
        }, 1000);
    }, 100);
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
    
    printContent(content);
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
    if (currentDayIndex < 0 || !appData || !appData.days[currentDayIndex]) {
        console.error('Cannot print: no day selected', { currentDayIndex, appData });
        alert('Please select a day first');
        return;
    }
    
    const day = appData.days[currentDayIndex];
    const date = new Date(day.date + 'T12:00:00');
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    
    // Capture map as image
    let mapImage = '';
    if (map) {
        try {
            const canvas = map.getCanvas();
            mapImage = canvas.toDataURL('image/png');
        } catch (e) {
            console.warn('Could not capture map image:', e);
        }
    }
    
    let tripRows = day.trips.map((trip, i) => `
        <tr class="no-break">
            <td>${i + 1}</td>
            <td>${trip.request_time || '-'}</td>
            <td>${(trip.restaurant || 'Unknown').substring(0, 30)}${(trip.restaurant || '').length > 30 ? '...' : ''}</td>
            <td class="number">${(trip.distance || 0).toFixed(1)}</td>
            <td class="number">${formatCurrency(trip.base_fare || 0)}</td>
            <td class="number">${formatCurrency(trip.tip || 0)}</td>
            <td class="number">${formatCurrency(trip.total_pay || 0)}</td>
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
            
            ${mapImage ? `
            <div class="print-section">
                <h2>Route Map</h2>
                <div class="print-map">
                    <img src="${mapImage}" alt="Route Map" style="width: 100%; max-width: 100%; height: auto; border: 1px solid #ccc;">
                </div>
            </div>
            ` : ''}
            
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
    
    printContent(content);
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
    
    printContent(content);
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeTripEntry();
    }
});

// ========== TRIP ENTRY FUNCTIONS ==========

// Open trip entry modal
function openTripEntry() {
    document.getElementById('tripEntryModal').classList.add('active');
    // Set default date to today
    document.getElementById('entryDate').valueAsDate = new Date();
}

// Open trip entry modal for the current day view
function openTripEntryForDay() {
    document.getElementById('tripEntryModal').classList.add('active');
    // Set date to the currently viewed day
    if (currentDayIndex >= 0 && appData.days[currentDayIndex]) {
        document.getElementById('entryDate').value = appData.days[currentDayIndex].date;
    } else {
        document.getElementById('entryDate').valueAsDate = new Date();
    }
}

// Close trip entry modal
function closeTripEntry() {
    document.getElementById('tripEntryModal').classList.remove('active');
    document.getElementById('tripEntryForm').reset();
}

// Save trip entry
function saveTripEntry(event) {
    event.preventDefault();
    
    const date = document.getElementById('entryDate').value;
    const time = document.getElementById('entryTime').value;
    const restaurant = document.getElementById('entryRestaurant').value;
    const pickup = document.getElementById('entryPickup').value || 'Not specified';
    const dropoff = document.getElementById('entryDropoff').value || 'Not specified';
    const distance = parseFloat(document.getElementById('entryDistance').value) || 0;
    const duration = parseInt(document.getElementById('entryDuration').value) || 0;
    const baseFare = parseFloat(document.getElementById('entryBase').value) || 0;
    const tip = parseFloat(document.getElementById('entryTip').value) || 0;
    const incentive = parseFloat(document.getElementById('entryIncentive').value) || 0;
    const platform = document.getElementById('entryPlatform').value;
    const notes = document.getElementById('entryNotes').value || '';
    
    // Calculate total pay
    const totalPay = baseFare + tip + incentive;
    
    // Create trip object
    const newTrip = {
        restaurant: restaurant,
        request_time: time,
        dropoff_time: time, // Will be calculated if duration provided
        duration: duration > 0 ? `${duration} min` : 'N/A',
        distance: distance,
        pickup_address: pickup,
        dropoff_address: dropoff,
        base_fare: baseFare,
        tip: tip,
        incentive: incentive,
        order_refund: 0,
        total_pay: totalPay,
        platform: platform,
        notes: notes,
        manual_entry: true
    };
    
    // Find or create the day in appData
    let dayIndex = appData.days.findIndex(d => d.date === date);
    
    if (dayIndex === -1) {
        // Create new day entry
        const newDay = {
            date: date,
            trips: [newTrip],
            stats: {
                trip_count: 1,
                total_earnings: totalPay,
                total_tips: tip,
                total_distance: distance,
                start_time: time,
                end_time: time
            }
        };
        
        // Insert in correct position (sorted by date)
        let insertIndex = appData.days.findIndex(d => d.date < date);
        if (insertIndex === -1) {
            appData.days.push(newDay);
        } else {
            appData.days.splice(insertIndex, 0, newDay);
        }
    } else {
        // Add to existing day
        appData.days[dayIndex].trips.push(newTrip);
        
        // Update day stats
        const day = appData.days[dayIndex];
        day.stats.trip_count++;
        day.stats.total_earnings += totalPay;
        day.stats.total_tips += tip;
        day.stats.total_distance += distance;
    }
    
    // Update global stats
    appData.stats.total_trips++;
    appData.stats.total_earnings += totalPay;
    appData.stats.total_tips += tip;
    appData.stats.total_distance += distance;
    
    // Save to localStorage
    saveOfflineTrips();
    
    // Refresh the UI
    updateAllStats();
    renderDaysGrid();
    
    // If we're viewing the day we just added to, refresh that view
    if (currentDayIndex !== -1) {
        const viewedDate = appData.days[currentDayIndex]?.date;
        if (viewedDate === date) {
            // Refresh the current day view
            renderMapView(appData.days[currentDayIndex]);
        } else {
            // Find the day we just added to and switch to it
            const newDayIndex = appData.days.findIndex(d => d.date === date);
            if (newDayIndex !== -1 && document.getElementById('mapView').classList.contains('active')) {
                openDay(newDayIndex);
            }
        }
    }
    
    // Close modal
    closeTripEntry();
    
    // Show success message
    showToast(`Trip added: ${restaurant} - ${formatCurrency(totalPay)}`);
}

// Save offline trips to localStorage
function saveOfflineTrips() {
    const offlineTrips = [];
    appData.days.forEach(day => {
        day.trips.forEach(trip => {
            if (trip.manual_entry) {
                offlineTrips.push({
                    date: day.date,
                    ...trip
                });
            }
        });
    });
    localStorage.setItem('courierRoutes_offlineTrips', JSON.stringify(offlineTrips));
}

// Load offline trips from localStorage
function loadOfflineTrips() {
    const saved = localStorage.getItem('courierRoutes_offlineTrips');
    if (!saved) return;
    
    const offlineTrips = JSON.parse(saved);
    
    offlineTrips.forEach(savedTrip => {
        const { date, ...tripData } = savedTrip;
        
        let dayIndex = appData.days.findIndex(d => d.date === date);
        
        // Check if trip already exists (avoid duplicates on reload)
        if (dayIndex !== -1) {
            const exists = appData.days[dayIndex].trips.some(t => 
                t.manual_entry && 
                t.request_time === tripData.request_time && 
                t.restaurant === tripData.restaurant
            );
            if (exists) return;
        }
        
        if (dayIndex === -1) {
            // Create new day
            const newDay = {
                date: date,
                trips: [tripData],
                stats: {
                    trip_count: 1,
                    total_earnings: tripData.total_pay,
                    total_tips: tripData.tip,
                    total_distance: tripData.distance,
                    start_time: tripData.request_time,
                    end_time: tripData.request_time
                }
            };
            
            let insertIndex = appData.days.findIndex(d => d.date < date);
            if (insertIndex === -1) {
                appData.days.push(newDay);
            } else {
                appData.days.splice(insertIndex, 0, newDay);
            }
            appData.stats.total_days++;
        } else {
            appData.days[dayIndex].trips.push(tripData);
            
            const day = appData.days[dayIndex];
            day.stats.trip_count++;
            day.stats.total_earnings += tripData.total_pay;
            day.stats.total_tips += tripData.tip;
            day.stats.total_distance += tripData.distance;
        }
        
        appData.stats.total_trips++;
        appData.stats.total_earnings += tripData.total_pay;
        appData.stats.total_tips += tripData.tip;
        appData.stats.total_distance += tripData.distance;
    });
}

// Show toast notification
function showToast(message) {
    // Create toast element if it doesn't exist
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Update all stats displays
function updateAllStats() {
    // Nav stats
    document.getElementById('navEarnings').textContent = formatCurrency(appData.stats.total_earnings);
    document.getElementById('navTripCount').textContent = appData.stats.total_trips;
    
    // Home stats (elements may not exist)
    const homeEarnings = document.getElementById('homeEarnings');
    const homeTrips = document.getElementById('homeTrips');
    const homeDays = document.getElementById('homeDays');
    if (homeEarnings) homeEarnings.textContent = formatCurrency(appData.stats.total_earnings);
    if (homeTrips) homeTrips.textContent = appData.stats.total_trips;
    if (homeDays) homeDays.textContent = appData.stats.total_days || appData.days.length;
    
    // Reports stats
    renderReportsPage();
}
// ==================== BATCH UPLOAD FUNCTIONS ====================

let batchTrips = [];

function openBatchUpload() {
    document.getElementById('batchUploadModal').style.display = 'flex';
    batchTrips = [];
    document.getElementById('batchPreview').style.display = 'none';
    document.getElementById('importBtn').disabled = true;
}

function closeBatchUpload() {
    document.getElementById('batchUploadModal').style.display = 'none';
    batchTrips = [];
}

function handleDragOver(e) {
    e.preventDefault();
    document.getElementById('uploadArea').classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    document.getElementById('uploadArea').classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    document.getElementById('uploadArea').classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
        parseCSV(file);
    } else {
        showToast('Please upload a CSV file', 'error');
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        parseCSV(file);
    }
}

function parseCSV(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
        
        batchTrips = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length >= 8) {
                const trip = {
                    date: values[headers.indexOf('date')] || '',
                    time: values[headers.indexOf('time')] || '12:00',
                    restaurant: values[headers.indexOf('restaurant')] || 'Unknown',
                    pickup: values[headers.indexOf('pickup_address')] || '',
                    dropoff: values[headers.indexOf('dropoff_address')] || '',
                    distance: parseFloat(values[headers.indexOf('distance_miles')]) || 0,
                    duration: parseInt(values[headers.indexOf('duration_mins')]) || 0,
                    baseFare: parseFloat(values[headers.indexOf('base_fare')]) || 0,
                    tip: parseFloat(values[headers.indexOf('tip')]) || 0,
                    incentive: parseFloat(values[headers.indexOf('incentive')]) || 0,
                    platform: values[headers.indexOf('platform')] || 'other',
                    notes: values[headers.indexOf('notes')] || ''
                };
                trip.total = trip.baseFare + trip.tip + trip.incentive;
                batchTrips.push(trip);
            }
        }
        
        showBatchPreview();
    };
    reader.readAsText(file);
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function showBatchPreview() {
    if (batchTrips.length === 0) {
        showToast('No valid trips found in CSV', 'error');
        return;
    }
    
    document.getElementById('previewCount').textContent = batchTrips.length;
    const tbody = document.getElementById('previewBody');
    tbody.innerHTML = '';
    
    batchTrips.forEach(trip => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${trip.date}</td>
            <td>${trip.time}</td>
            <td>${trip.restaurant}</td>
            <td>${trip.platform}</td>
            <td>$${trip.total.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
    
    document.getElementById('batchPreview').style.display = 'block';
    document.getElementById('importBtn').disabled = false;
}

function importBatchTrips() {
    let imported = 0;
    
    batchTrips.forEach(trip => {
        const offlineTrip = {
            id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            date: trip.date,
            time: trip.time,
            restaurant: trip.restaurant,
            pickup: trip.pickup,
            dropoff: trip.dropoff,
            distance: trip.distance,
            duration: trip.duration,
            baseFare: trip.baseFare,
            tip: trip.tip,
            incentive: trip.incentive,
            platform: trip.platform,
            notes: trip.notes,
            total: trip.total,
            isOffline: true
        };
        
        // Get existing offline trips
        let offlineTrips = JSON.parse(localStorage.getItem('offlineTrips') || '[]');
        offlineTrips.push(offlineTrip);
        localStorage.setItem('offlineTrips', JSON.stringify(offlineTrips));
        imported++;
    });
    
    closeBatchUpload();
    showToast(`Successfully imported ${imported} trips!`, 'success');
    
    // Refresh the view
    if (typeof loadAllData === 'function') {
        loadAllData();
    }
}
