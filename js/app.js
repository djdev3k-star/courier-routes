/**
 * LastMile Ledger - Gig Driver Analytics Dashboard
 *
 * A client-side SPA for tracking delivery routes, earnings, and efficiency.
 * Data is loaded from Supabase and enhanced with localStorage for offline features.
 *
 * @version 1.0.0
 * @author LastMile Ledger
 */

import { fetchAllTrips, transformTripsToAppFormat } from './supabase-client.js';

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

/** Mapbox GL JS access token for map rendering */
const MAPBOX_TOKEN = 'pk.eyJ1IjoibXBieDE1IiwiYSI6ImNta2Y1a3dxZzAzZ3AzZ29qNXQ1bmpiaGsifQ.tCkudl7SJNzzHCARPEzC9w';

// ============================================================================
// APPLICATION STATE
// ============================================================================

/** @type {Object|null} Main application data (stats + days array) */
let appData = null;

/** @type {number} Currently selected day index in routes view */
let currentDayIndex = -1;

/** @type {Object|null} Mapbox GL map instance */
let map = null;

/** @type {Array} Active map markers for cleanup */
let mapMarkers = [];

/** @type {Object|null} Currently highlighted trip on map */
let activeTrip = null;

/** @type {string} Current active page/view */
let currentPage = 'home';

/** @type {Date|null} Start date for week navigation */
let currentWeekStart = null;

/** @type {boolean} Whether week view is active */
let weekViewActive = false;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/** Show trip UUID in detail modal (shelved for v2) */
const FEATURE_SHOW_TRIP_UUID = false;

/** Show full dropoff address without masking (shelved for privacy) */
const FEATURE_SHOW_FULL_DROPOFF = false;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Mask dropoff address for privacy (hide street number/apt)
 * @param {string} address - Full dropoff address
 * @returns {string} Masked address with street number removed
 */
function maskDropoffAddress(address) {
    if (!address || FEATURE_SHOW_FULL_DROPOFF) return address;
    return address.replace(/^\d+\s+/, '').replace(/,?\s*(apt|unit|#|suite)\s*\S*/gi, '');
}

/**
 * Sanitize pickup address by removing redundant restaurant name prefix
 * @param {string} address - Full pickup address
 * @param {string} restaurant - Restaurant name to check for
 * @returns {string} Cleaned address
 */
function sanitizePickupAddress(address, restaurant) {
    if (!address) return address;
    let clean = address;
    
    // Pattern: "Restaurant Name (location), actual address"
    const prefixMatch = clean.match(/^[^,]+\([^)]+\),\s*/);
    if (prefixMatch) {
        clean = clean.substring(prefixMatch[0].length);
    }
    
    // Also try removing just restaurant name at start
    if (restaurant && clean.toLowerCase().startsWith(restaurant.toLowerCase())) {
        clean = clean.substring(restaurant.length).replace(/^[\s,]+/, '');
    }
    
    // Clean up and normalize
    clean = clean.replace(/\s+/g, ' ').trim();
    clean = clean.replace(/^(\d+\s+)?([a-z])/i, (m, num, letter) => 
        (num || '') + letter.toUpperCase()
    );
    
    return clean;
}

/**
 * Format pickup display for detail modal
 * @param {string} address - Pickup address
 * @param {string} restaurant - Restaurant name
 * @returns {Object} Object with restaurant and cleaned address
 */
function formatPickupDisplay(address, restaurant) {
    const cleanAddress = sanitizePickupAddress(address, restaurant);
    return { restaurant, address: cleanAddress };
}

/**
 * HTML escape helper for XSS protection
 * @param {string} text - Text to escape
 * @returns {string} HTML-safe string
 */
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Safe localStorage JSON getter with error handling
 * @param {string} key - localStorage key
 * @param {*} defaultValue - Default if key not found or parse fails
 * @returns {*} Parsed JSON or default value
 */
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

// ============================================================================
// DATA LOADING & INITIALIZATION
// ============================================================================

/**
 * Initialize the application - load data and render
 */
async function init() {
    try {
        const trips = await fetchAllTrips();
        appData = transformTripsToAppFormat(trips);

        // Load any manually entered offline trips
        loadOfflineTrips();

        renderApp();
    } catch (error) {
        console.error('Failed to load data:', error);
        document.body.innerHTML = '<div style="padding:100px 40px;text-align:center;color:#fff;"><h2>Failed to load route data</h2><p style="color:#888;margin-top:12px;">Error: ' + error.message + '</p></div>';
    }
}

/**
 * Render all app components after data load
 */
function renderApp() {
    const stats = appData?.stats || { total_earnings: 0, total_trips: 0 };
    const navEarnings = document.getElementById('navEarnings');
    const navTripCount = document.getElementById('navTripCount');

    if (navEarnings) {
        navEarnings.textContent = '$' + Math.round(stats.total_earnings || 0).toLocaleString();
    }
    if (navTripCount) {
        navTripCount.textContent = (stats.total_trips || 0).toLocaleString();
    }

    renderHomePage();
    renderRoutesPage();
    renderReportsPage();
    initWeekNavigation();

    // Set initial nav state (home page shows auth, not stats)
    updateNavForPage(currentPage);
}

// ============================================================================
// PAGE RENDERING
// ============================================================================

/**
 * Render home page with hero stats and preview
 */
function renderHomePage() {
    if (!appData || !appData.stats || !appData.days) return;
    const stats = appData.stats;
    const days = appData.days;
    
    // Hero social proof stats
    const heroTrips = document.getElementById('heroTrips');
    const heroMiles = document.getElementById('heroMiles');
    const heroEarnings = document.getElementById('heroEarnings');
    if (heroTrips) heroTrips.textContent = (stats.total_trips || 847).toLocaleString();
    if (heroMiles) heroMiles.textContent = Math.round(stats.total_distance || 2340).toLocaleString();
    if (heroEarnings) heroEarnings.textContent = '$' + Math.round(stats.total_earnings || 12450).toLocaleString();
    
    // Dashboard preview stats
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayData = days.find(d => d.date === todayStr);
    const previewToday = document.getElementById('previewToday');
    if (previewToday) {
        // Show realistic demo value if no data for today
        const todayEarnings = todayData ? todayData.stats.total_earnings : 127.45;
        previewToday.textContent = '$' + todayEarnings.toFixed(2);
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
    // Show realistic demo value if no data for this week
    if (previewWeek) previewWeek.textContent = '$' + (weekEarnings || 412.80).toFixed(2);
    
    // Mini chart in preview (last 7 days)
    const previewChart = document.getElementById('previewChart');
    if (previewChart) {
        const last7 = days.slice(-7);
        // Use demo data if no real data
        const chartData = last7.length > 0 ? last7.map(d => d.stats.total_earnings) : [85, 142, 98, 167, 124, 156, 112];
        const maxDay = Math.max(...chartData, 1);
        previewChart.innerHTML = chartData.map(earnings => {
            const height = (earnings / maxDay) * 100;
            return `<div class="preview-bar" style="height: ${Math.max(height, 5)}%"></div>`;
        }).join('');
    }
    
    // Quick stats
    const bestDay = [...days].sort((a, b) => b.stats.total_earnings - a.stats.total_earnings)[0];
    const avgPerTrip = stats.total_trips > 0 ? stats.total_earnings / stats.total_trips : 14.68;
    const tipRate = stats.total_earnings > 0 ? (stats.total_tips / stats.total_earnings) * 100 : 32;
    
    const quickBestDay = document.getElementById('quickBestDay');
    const quickAvgTrip = document.getElementById('quickAvgTrip');
    const quickTotalDays = document.getElementById('quickTotalDays');
    const quickTipRate = document.getElementById('quickTipRate');
    
    if (quickBestDay) quickBestDay.textContent = '$' + (bestDay ? bestDay.stats.total_earnings.toFixed(2) : '186.42');
    if (quickAvgTrip) quickAvgTrip.textContent = '$' + avgPerTrip.toFixed(2);
    if (quickTotalDays) quickTotalDays.textContent = stats.total_days || 58;
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
    if (!appData || !appData.days || !container) return;
    const days = appData.days;
    const maxEarnings = Math.max(...days.map(d => d.stats?.total_earnings || 0));

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
    if (!appData || !appData.stats || !appData.days) return;
    const stats = appData.stats;
    const days = appData.days;

    document.getElementById('reportEarnings').textContent = '$' + (stats.total_earnings || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('reportTrips').textContent = (stats.total_trips || 0).toLocaleString();
    document.getElementById('reportMiles').textContent = Math.round(stats.total_distance).toLocaleString();
    document.getElementById('reportTips').textContent = '$' + stats.total_tips.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    document.getElementById('reportDays').textContent = stats.total_days;
    
    // Date range
    if (days.length > 0) {
        const firstDate = new Date(days[0].date + 'T12:00:00');
        const lastDate = new Date(days[days.length - 1].date + 'T12:00:00');
        const dateRangeStr = firstDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) + 
            ' - ' + lastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        document.getElementById('reportDateRange').textContent = dateRangeStr;
    }

    renderMonthlyTable();
    renderTopDays();
    renderWeekdayTotalsChart(); // Simple totals for Reports
    renderRefundsSection(); // Refunds tracker
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

// Render weekday TOTALS chart for Reports page (simple bar chart)
function renderWeekdayTotalsChart() {
    const weekdayData = {
        'Sun': { earnings: 0, trips: 0 },
        'Mon': { earnings: 0, trips: 0 },
        'Tue': { earnings: 0, trips: 0 },
        'Wed': { earnings: 0, trips: 0 },
        'Thu': { earnings: 0, trips: 0 },
        'Fri': { earnings: 0, trips: 0 },
        'Sat': { earnings: 0, trips: 0 }
    };

    appData.days.forEach(day => {
        const date = new Date(day.date + 'T12:00:00');
        const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
        weekdayData[weekday].earnings += day.stats.total_earnings;
        weekdayData[weekday].trips += day.stats.trip_count;
    });

    const maxEarnings = Math.max(...Object.values(weekdayData).map(d => d.earnings));
    const container = document.getElementById('weekdayChart');

    container.innerHTML = `
        <div class="weekday-totals-chart">
            ${Object.entries(weekdayData).map(([day, data]) => {
                const height = maxEarnings > 0 ? (data.earnings / maxEarnings) * 100 : 0;
                return `
                    <div class="weekday-bar ${data.trips === 0 ? 'no-data' : ''}">
                        <div class="weekday-value">$${Math.round(data.earnings)}</div>
                        <div class="weekday-bar-container">
                            <div class="weekday-bar-fill" style="height: ${height}%"></div>
                        </div>
                        <div class="weekday-label">${day}</div>
                        <div class="weekday-trips">${data.trips}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Render weekday EFFICIENCY chart for Stats page (per-trip metrics)
function renderWeekdayEfficiencyChart() {
    const weekdayData = {
        'Sun': { earnings: 0, tips: 0, trips: 0, distance: 0, daysWorked: 0 },
        'Mon': { earnings: 0, tips: 0, trips: 0, distance: 0, daysWorked: 0 },
        'Tue': { earnings: 0, tips: 0, trips: 0, distance: 0, daysWorked: 0 },
        'Wed': { earnings: 0, tips: 0, trips: 0, distance: 0, daysWorked: 0 },
        'Thu': { earnings: 0, tips: 0, trips: 0, distance: 0, daysWorked: 0 },
        'Fri': { earnings: 0, tips: 0, trips: 0, distance: 0, daysWorked: 0 },
        'Sat': { earnings: 0, tips: 0, trips: 0, distance: 0, daysWorked: 0 }
    };

    appData.days.forEach(day => {
        const date = new Date(day.date + 'T12:00:00');
        const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
        weekdayData[weekday].earnings += day.stats.total_earnings;
        weekdayData[weekday].tips += day.stats.total_tips;
        weekdayData[weekday].trips += day.stats.trip_count;
        weekdayData[weekday].distance += day.stats.total_distance;
        weekdayData[weekday].daysWorked += 1;
    });

    // Calculate per-trip metrics
    const weekdayMetrics = Object.entries(weekdayData).map(([day, data]) => ({
        day,
        trips: data.trips,
        daysWorked: data.daysWorked,
        avgPerTrip: data.trips > 0 ? data.earnings / data.trips : 0,
        avgTipPerTrip: data.trips > 0 ? data.tips / data.trips : 0,
        tipRate: data.earnings > 0 ? (data.tips / data.earnings) * 100 : 0,
        avgPerMile: data.distance > 0 ? data.earnings / data.distance : 0,
        avgTripsPerDay: data.daysWorked > 0 ? data.trips / data.daysWorked : 0,
        totalEarnings: data.earnings
    }));

    const maxAvgPerTrip = Math.max(...weekdayMetrics.map(d => d.avgPerTrip));
    const container = document.getElementById('statsWeekdayChart');
    if (!container) return;

    container.innerHTML = `
        <div class="weekday-analysis">
            <div class="weekday-chart-bars">
                ${weekdayMetrics.map(m => {
                    const height = maxAvgPerTrip > 0 ? (m.avgPerTrip / maxAvgPerTrip) * 100 : 0;
                    const isTopDay = m.avgPerTrip === maxAvgPerTrip && m.trips > 0;
                    return `
                        <div class="weekday-bar ${isTopDay ? 'top-day' : ''} ${m.trips === 0 ? 'no-data' : ''}">
                            <div class="weekday-value">$${m.avgPerTrip.toFixed(2)}</div>
                            <div class="weekday-bar-container">
                                <div class="weekday-bar-fill" style="height: ${height}%"></div>
                            </div>
                            <div class="weekday-label">${m.day}</div>
                            <div class="weekday-trips">${m.trips} trips</div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="weekday-metrics-table">
                <div class="weekday-metrics-header">
                    <span>Day</span>
                    <span>$/Trip</span>
                    <span>Tip/Trip</span>
                    <span>Tip %</span>
                    <span>$/Mile</span>
                    <span>Trips/Day</span>
                </div>
                ${weekdayMetrics.map(m => `
                    <div class="weekday-metrics-row ${m.trips === 0 ? 'no-data' : ''}">
                        <span class="weekday-metrics-day">${m.day}</span>
                        <span class="metric-value earnings">$${m.avgPerTrip.toFixed(2)}</span>
                        <span class="metric-value tip">$${m.avgTipPerTrip.toFixed(2)}</span>
                        <span class="metric-value">${m.tipRate.toFixed(0)}%</span>
                        <span class="metric-value">$${m.avgPerMile.toFixed(2)}</span>
                        <span class="metric-value">${m.avgTripsPerDay.toFixed(1)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="weekday-insight">
                <span class="insight-label">Best earning day per trip:</span>
                <span class="insight-value">${weekdayMetrics.reduce((best, m) => m.avgPerTrip > best.avgPerTrip ? m : best, weekdayMetrics[0]).day}</span>
            </div>
        </div>
    `;
}

// Parse duration string like "39 min" or "1h 12m" to minutes
function parseDuration(durationStr) {
    if (!durationStr) return 0;
    
    // Handle "Xh Ym" format
    const hourMatch = durationStr.match(/(\d+)h\s*(\d+)?m?/);
    if (hourMatch) {
        const hours = parseInt(hourMatch[1]) || 0;
        const mins = parseInt(hourMatch[2]) || 0;
        return hours * 60 + mins;
    }
    
    // Handle "X min" format
    const minMatch = durationStr.match(/(\d+)\s*min/);
    if (minMatch) {
        return parseInt(minMatch[1]) || 0;
    }
    
    return 0;
}

// Trip Efficiency Analysis
let currentEfficiencyFilter = 'all';

function renderTripEfficiencyAnalysis() {
    const allTrips = [];
    
    // Collect all trips with calculated efficiency metrics
    appData.days.forEach(day => {
        day.trips.forEach((trip, tripIndex) => {
            const duration = parseDuration(trip.duration);
            const pay = trip.total_pay || trip.earnings || 0;
            const distance = trip.distance || 0;
            
            // Calculate per-hour and per-mile rates
            const perHour = duration > 0 ? (pay / duration) * 60 : 0;
            const perMile = distance > 0 ? pay / distance : 0;
            
            // Categorize trip
            let category = 'other';
            let isOptimal = false;
            let isAcceptable = false;
            let isShort = duration > 0 && duration < 15;
            let isLong = duration > 25;
            let isLowPay = pay < 8;
            
            // Optimal: 15-25 min AND $15+
            if (duration >= 15 && duration <= 25 && pay >= 15) {
                category = 'optimal';
                isOptimal = true;
            }
            // Acceptable: $8+ any duration (but not already optimal)
            else if (pay >= 8) {
                category = 'acceptable';
                isAcceptable = true;
            }
            // Short trip (under 15 min, not optimal/acceptable)
            else if (isShort) {
                category = 'short';
            }
            // Long trip (over 25 min, not optimal/acceptable)
            else if (isLong) {
                category = 'long';
            }
            // Low pay (under $8)
            else {
                category = 'low-pay';
            }
            
            allTrips.push({
                date: day.date,
                dayIndex: appData.days.indexOf(day),
                tripIndex,
                restaurant: trip.restaurant || 'Unknown',
                duration,
                durationStr: trip.duration,
                pay,
                distance,
                perHour,
                perMile,
                category,
                isOptimal,
                isAcceptable,
                isShort,
                isLong,
                isLowPay
            });
        });
    });
    
    // Calculate summary counts
    const optimalCount = allTrips.filter(t => t.category === 'optimal').length;
    const acceptableCount = allTrips.filter(t => t.category === 'acceptable').length;
    const shortCount = allTrips.filter(t => t.isShort && t.category !== 'optimal' && t.category !== 'acceptable').length;
    const longCount = allTrips.filter(t => t.isLong && t.category !== 'optimal' && t.category !== 'acceptable').length;
    const lowPayCount = allTrips.filter(t => t.isLowPay).length;
    
    // Calculate average metrics
    const tripsWithDuration = allTrips.filter(t => t.duration > 0);
    const avgDuration = tripsWithDuration.length > 0 
        ? tripsWithDuration.reduce((sum, t) => sum + t.duration, 0) / tripsWithDuration.length 
        : 0;
    const avgPerHour = tripsWithDuration.length > 0 
        ? tripsWithDuration.reduce((sum, t) => sum + t.perHour, 0) / tripsWithDuration.length 
        : 0;
    
    const tripsWithDistance = allTrips.filter(t => t.distance > 0);
    const avgPerMile = tripsWithDistance.length > 0 
        ? tripsWithDistance.reduce((sum, t) => sum + t.perMile, 0) / tripsWithDistance.length 
        : 0;
    
    // Efficiency score = % of optimal + acceptable trips
    const efficiencyScore = allTrips.length > 0 
        ? ((optimalCount + acceptableCount) / allTrips.length) * 100 
        : 0;
    
    // Update summary stats
    document.getElementById('effOptimalCount').textContent = optimalCount;
    document.getElementById('effAcceptableCount').textContent = acceptableCount;
    document.getElementById('effShortCount').textContent = shortCount;
    document.getElementById('effLongCount').textContent = longCount;
    document.getElementById('effLowPayCount').textContent = lowPayCount;
    
    // Update metrics with color coding
    const avgPerHourEl = document.getElementById('effAvgPerHour');
    avgPerHourEl.textContent = '$' + avgPerHour.toFixed(2);
    avgPerHourEl.className = 'efficiency-metric-value ' + (avgPerHour >= 30 ? 'good' : avgPerHour >= 20 ? 'warning' : 'bad');
    
    const avgPerMileEl = document.getElementById('effAvgPerMile');
    avgPerMileEl.textContent = '$' + avgPerMile.toFixed(2);
    avgPerMileEl.className = 'efficiency-metric-value ' + (avgPerMile >= 2 ? 'good' : avgPerMile >= 1.5 ? 'warning' : 'bad');
    
    document.getElementById('effAvgDuration').textContent = avgDuration.toFixed(0) + ' min';
    
    const effScoreEl = document.getElementById('effScore');
    effScoreEl.textContent = efficiencyScore.toFixed(0) + '%';
    effScoreEl.className = 'efficiency-metric-value ' + (efficiencyScore >= 50 ? 'good' : efficiencyScore >= 30 ? 'warning' : 'bad');
    
    // Render trip list with tabs
    renderTripEfficiencyList(allTrips, currentEfficiencyFilter);
}

function renderTripEfficiencyList(allTrips, filter) {
    const container = document.getElementById('tripEfficiencyList');
    
    // Filter trips based on selected tab
    let filteredTrips = allTrips;
    if (filter === 'optimal') {
        filteredTrips = allTrips.filter(t => t.category === 'optimal');
    } else if (filter === 'acceptable') {
        filteredTrips = allTrips.filter(t => t.category === 'acceptable');
    } else if (filter === 'short') {
        filteredTrips = allTrips.filter(t => t.isShort && t.category !== 'optimal' && t.category !== 'acceptable');
    } else if (filter === 'long') {
        filteredTrips = allTrips.filter(t => t.isLong && t.category !== 'optimal' && t.category !== 'acceptable');
    } else if (filter === 'low-pay') {
        filteredTrips = allTrips.filter(t => t.isLowPay);
    }
    
    // Sort by date descending, then by per-hour rate
    filteredTrips.sort((a, b) => {
        const dateCompare = new Date(b.date) - new Date(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.perHour - a.perHour;
    });
    
    // Limit to most recent 50
    const displayTrips = filteredTrips.slice(0, 50);
    
    container.innerHTML = `
        <div class="efficiency-list-header">
            <h3>${filter === 'all' ? 'Recent Trips' : filter.charAt(0).toUpperCase() + filter.slice(1).replace('-', ' ') + ' Trips'} (${filteredTrips.length})</h3>
            <div class="efficiency-list-tabs">
                <button class="efficiency-tab ${filter === 'all' ? 'active' : ''}" onclick="filterEfficiencyTrips('all')">All</button>
                <button class="efficiency-tab ${filter === 'optimal' ? 'active' : ''}" onclick="filterEfficiencyTrips('optimal')">Optimal</button>
                <button class="efficiency-tab ${filter === 'acceptable' ? 'active' : ''}" onclick="filterEfficiencyTrips('acceptable')">OK</button>
                <button class="efficiency-tab ${filter === 'short' ? 'active' : ''}" onclick="filterEfficiencyTrips('short')">Short</button>
                <button class="efficiency-tab ${filter === 'long' ? 'active' : ''}" onclick="filterEfficiencyTrips('long')">Long</button>
                <button class="efficiency-tab ${filter === 'low-pay' ? 'active' : ''}" onclick="filterEfficiencyTrips('low-pay')">Low $</button>
            </div>
        </div>
        ${displayTrips.length > 0 ? displayTrips.map(trip => {
            const date = new Date(trip.date + 'T12:00:00');
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            // Duration class
            let durationClass = '';
            if (trip.duration >= 15 && trip.duration <= 25) durationClass = 'optimal';
            else if (trip.duration < 15 && trip.duration > 0) durationClass = 'short';
            else if (trip.duration > 25) durationClass = 'long';
            
            // Pay class
            let payClass = '';
            if (trip.pay >= 15) payClass = 'good';
            else if (trip.pay >= 8) payClass = 'acceptable';
            else payClass = 'low';
            
            // Per-hour class
            const perHourClass = trip.perHour >= 30 ? 'good' : 'bad';
            
            // Per-mile class
            const perMileClass = trip.perMile >= 2 ? 'good' : 'bad';
            
            return `
                <div class="efficiency-trip-row" onclick="openDay(${trip.dayIndex})">
                    <div class="efficiency-trip-date">${dateStr}</div>
                    <div class="efficiency-trip-restaurant">${trip.restaurant}</div>
                    <div class="efficiency-trip-duration ${durationClass}">${trip.durationStr || '-'}</div>
                    <div class="efficiency-trip-pay ${payClass}">$${trip.pay.toFixed(2)}</div>
                    <div class="efficiency-trip-per-hour ${perHourClass}">$${trip.perHour.toFixed(0)}/hr</div>
                    <div class="efficiency-trip-per-mile ${perMileClass}">$${trip.perMile.toFixed(2)}/mi</div>
                </div>
            `;
        }).join('') : '<div class="refunds-empty">No trips match this filter</div>'}
    `;
}

function filterEfficiencyTrips(filter) {
    currentEfficiencyFilter = filter;
    renderTripEfficiencyAnalysis();
}

// Render stats page
function renderStatsPage() {
    if (!appData || !appData.stats || !appData.days) return;
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
    
    // Quick stats row
    document.getElementById('statsAvgTrip').textContent = '$' + avgPerTrip.toFixed(2);
    document.getElementById('statsAvgHour').textContent = '$' + avgPerHour.toFixed(2);
    document.getElementById('statsAvgMile').textContent = '$' + avgPerMile.toFixed(2);
    document.getElementById('statsAvgDay').textContent = '$' + avgPerDay.toFixed(2);
    document.getElementById('statsTips').textContent = '$' + stats.total_tips.toFixed(2);
    document.getElementById('statsTipRate').textContent = tipRate.toFixed(0) + '%';
    
    // This week stats - use latest week from data (2025)
    const latestDate = days.length > 0 ? new Date(days[days.length - 1].date + 'T12:00:00') : new Date();
    const startOfWeek = getWeekStart(latestDate);
    const endOfWeek = getWeekEnd(startOfWeek);
    
    const thisWeekDays = days.filter(day => {
        const d = new Date(day.date + 'T12:00:00');
        return d >= startOfWeek && d <= endOfWeek;
    });
    
    const weekEarnings = thisWeekDays.reduce((sum, d) => sum + d.stats.total_earnings, 0);
    const weekTrips = thisWeekDays.reduce((sum, d) => sum + d.stats.trip_count, 0);
    const weekMiles = thisWeekDays.reduce((sum, d) => sum + d.stats.total_distance, 0);
    const weekHours = weekTrips * 0.25;
    const weekGoal = 500;
    const weekProgress = Math.min((weekEarnings / weekGoal) * 100, 100);
    const weekPerHour = weekHours > 0 ? weekEarnings / weekHours : 0;
    
    // Week date range
    const weekRangeStr = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + 
        ' - ' + endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    document.getElementById('statsWeekRange').textContent = weekRangeStr;
    
    document.getElementById('statsWeekEarnings').textContent = '$' + weekEarnings.toFixed(2);
    document.getElementById('statsWeekTrips').textContent = weekTrips;
    document.getElementById('statsWeekMiles').textContent = weekMiles.toFixed(1);
    document.getElementById('statsWeekPerHour').textContent = '$' + weekPerHour.toFixed(2);
    document.getElementById('statsWeekGoalFill').style.width = weekProgress + '%';
    document.getElementById('statsWeekGoalPercent').textContent = Math.round(weekProgress) + '%';
    
    // Best day insight
    const bestDay = [...days].sort((a, b) => b.stats.total_earnings - a.stats.total_earnings)[0];
    if (bestDay) {
        const bestDate = new Date(bestDay.date + 'T12:00:00');
        document.getElementById('statsBestDay').textContent = bestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        document.getElementById('statsBestDayDetail').textContent = '$' + bestDay.stats.total_earnings.toFixed(2);
    }
    
    // Top restaurant insight
    const restaurantCounts = {};
    days.forEach(day => {
        day.trips.forEach(trip => {
            const name = trip.restaurant || 'Unknown';
            restaurantCounts[name] = (restaurantCounts[name] || 0) + 1;
        });
    });
    const topRestaurant = Object.entries(restaurantCounts).sort((a, b) => b[1] - a[1])[0];
    if (topRestaurant) {
        document.getElementById('statsTopRestaurant').textContent = topRestaurant[0].substring(0, 18) + (topRestaurant[0].length > 18 ? '...' : '');
        document.getElementById('statsTopRestaurantDetail').textContent = topRestaurant[1] + ' pickups';
    }
    
    // Best hours insight - find peak windows based on frequency + earnings
    const hourStats = {};
    days.forEach(day => {
        day.trips.forEach(trip => {
            if (trip.request_time) {
                // Parse time like "07:09 PM" or "19:09"
                let hour;
                const timeStr = trip.request_time;
                if (timeStr.includes('AM') || timeStr.includes('PM')) {
                    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
                    if (match) {
                        hour = parseInt(match[1]);
                        const isPM = match[3].toUpperCase() === 'PM';
                        if (isPM && hour !== 12) hour += 12;
                        if (!isPM && hour === 12) hour = 0;
                    }
                } else {
                    hour = parseInt(timeStr.split(':')[0]);
                }
                if (hour !== undefined && !isNaN(hour)) {
                    if (!hourStats[hour]) hourStats[hour] = { trips: 0, earnings: 0 };
                    hourStats[hour].trips += 1;
                    hourStats[hour].earnings += (trip.total_pay || trip.earnings || 0);
                }
            }
        });
    });
    
    // Calculate score: normalize trips and earnings, combine them
    const hourData = Object.entries(hourStats).map(([hour, data]) => ({
        hour: parseInt(hour),
        trips: data.trips,
        earnings: data.earnings,
        avgPay: data.trips > 0 ? data.earnings / data.trips : 0
    }));
    
    if (hourData.length > 0) {
        const maxTrips = Math.max(...hourData.map(h => h.trips));
        const maxAvgPay = Math.max(...hourData.map(h => h.avgPay));
        
        // Score = 50% frequency + 50% avg pay (normalized)
        hourData.forEach(h => {
            h.score = (h.trips / maxTrips * 0.5) + (h.avgPay / maxAvgPay * 0.5);
        });
        
        // Sort by score and get top hours
        const topHours = hourData.sort((a, b) => b.score - a.score).slice(0, 4).map(h => h.hour).sort((a, b) => a - b);
        
        // Find contiguous ranges
        const ranges = [];
        let rangeStart = topHours[0];
        let rangeEnd = topHours[0];
        
        for (let i = 1; i < topHours.length; i++) {
            if (topHours[i] === rangeEnd + 1) {
                rangeEnd = topHours[i];
            } else {
                ranges.push({ start: rangeStart, end: rangeEnd });
                rangeStart = topHours[i];
                rangeEnd = topHours[i];
            }
        }
        ranges.push({ start: rangeStart, end: rangeEnd });
        
        // Format time ranges
        const formatHour = (h) => {
            const ampm = h >= 12 ? 'p' : 'a';
            const display = h % 12 || 12;
            return display + ampm;
        };
        
        const rangeStr = ranges.map(r => 
            r.start === r.end ? formatHour(r.start) : formatHour(r.start) + '-' + formatHour(r.end + 1)
        ).join(', ');
        
        const topAvgPay = hourData.slice(0, 4).reduce((sum, h) => sum + h.avgPay, 0) / Math.min(4, hourData.length);
        
        document.getElementById('statsBestHour').textContent = rangeStr;
        document.getElementById('statsBestHourDetail').textContent = '$' + topAvgPay.toFixed(2) + '/trip avg';
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
    
    // Tax bar
    const mileageDeduction = stats.total_distance * 0.67;
    const taxableIncome = Math.max(stats.total_earnings - mileageDeduction, 0);
    document.getElementById('statsTaxDeduction').textContent = '$' + mileageDeduction.toFixed(2);
    document.getElementById('statsTaxable').textContent = '$' + taxableIncome.toFixed(2);
    
    // ========== RESTAURANT INTELLIGENCE ==========
    // Build comprehensive restaurant data
    const restaurantData = {};
    days.forEach(day => {
        day.trips.forEach(trip => {
            const name = trip.restaurant || 'Unknown';
            if (!restaurantData[name]) {
                restaurantData[name] = { 
                    trips: 0, 
                    totalTips: 0, 
                    totalPay: 0,
                    tippedTrips: 0
                };
            }
            restaurantData[name].trips += 1;
            restaurantData[name].totalTips += (trip.tip || 0);
            restaurantData[name].totalPay += (trip.total_pay || trip.earnings || 0);
            if (trip.tip > 0) restaurantData[name].tippedTrips += 1;
        });
    });
    
    // Convert to array with calculated metrics
    const restaurants = Object.entries(restaurantData).map(([name, data]) => ({
        name,
        trips: data.trips,
        totalTips: data.totalTips,
        totalPay: data.totalPay,
        avgTip: data.trips > 0 ? data.totalTips / data.trips : 0,
        avgPay: data.trips > 0 ? data.totalPay / data.trips : 0,
        tipRate: data.trips > 0 ? (data.tippedTrips / data.trips) * 100 : 0
    }));
    
    // Best Tippers (min 10 trips, sorted by avg tip)
    const bestTippers = restaurants
        .filter(r => r.trips >= 10 && r.totalTips > 0)
        .sort((a, b) => b.avgTip - a.avgTip)
        .slice(0, 5);
    
    const tippersContainer = document.getElementById('statsRestaurantTippers');
    if (bestTippers.length > 0) {
        tippersContainer.innerHTML = bestTippers.map((r, i) => `
            <div class="restaurant-row clickable" onclick="searchRestaurant('${r.name.replace(/'/g, "\\'")}')">
                <span class="restaurant-rank">${i + 1}</span>
                <div class="restaurant-info">
                    <span class="restaurant-name">${r.name.substring(0, 22)}${r.name.length > 22 ? '...' : ''}</span>
                    <span class="restaurant-meta">${r.trips} trips | ${r.tipRate.toFixed(0)}% tip rate</span>
                </div>
                <span class="restaurant-stat">$${r.avgTip.toFixed(2)}</span>
            </div>
        `).join('');
    } else {
        tippersContainer.innerHTML = '<div class="restaurant-list-empty">Need 10+ trips to analyze</div>';
    }
    
    // Most Frequent (sorted by trip count)
    const mostFrequent = restaurants
        .filter(r => r.trips >= 10)
        .sort((a, b) => b.trips - a.trips)
        .slice(0, 5);
    
    const frequentContainer = document.getElementById('statsRestaurantFrequent');
    if (mostFrequent.length > 0) {
        frequentContainer.innerHTML = mostFrequent.map((r, i) => `
            <div class="restaurant-row clickable" onclick="searchRestaurant('${r.name.replace(/'/g, "\\'")}')">
                <span class="restaurant-rank">${i + 1}</span>
                <div class="restaurant-info">
                    <span class="restaurant-name">${r.name.substring(0, 22)}${r.name.length > 22 ? '...' : ''}</span>
                    <span class="restaurant-meta">$${r.totalPay.toFixed(0)} total earned</span>
                </div>
                <span class="restaurant-stat">${r.trips}x</span>
            </div>
        `).join('');
    } else {
        frequentContainer.innerHTML = '<div class="restaurant-list-empty">Need 10+ trips to analyze</div>';
    }
    
    // Best Value (min 10 trips, sorted by avg total pay)
    const bestValue = restaurants
        .filter(r => r.trips >= 10)
        .sort((a, b) => b.avgPay - a.avgPay)
        .slice(0, 5);
    
    const valueContainer = document.getElementById('statsRestaurantValue');
    if (bestValue.length > 0) {
        valueContainer.innerHTML = bestValue.map((r, i) => `
            <div class="restaurant-row clickable" onclick="searchRestaurant('${r.name.replace(/'/g, "\\'")}')">
                <span class="restaurant-rank">${i + 1}</span>
                <div class="restaurant-info">
                    <span class="restaurant-name">${r.name.substring(0, 22)}${r.name.length > 22 ? '...' : ''}</span>
                    <span class="restaurant-meta">${r.trips} trips | $${r.totalTips.toFixed(0)} tips</span>
                </div>
                <span class="restaurant-stat">$${r.avgPay.toFixed(2)}</span>
            </div>
        `).join('');
    } else {
        valueContainer.innerHTML = '<div class="restaurant-list-empty">Need 10+ trips to analyze</div>';
    }
    
    // Render weekday efficiency chart (per-trip analysis)
    renderWeekdayEfficiencyChart();
    
    // Render trip efficiency analysis
    renderTripEfficiencyAnalysis();
}

// Search for a specific restaurant - navigate to routes and filter
function searchRestaurant(restaurantName) {
    showPage('routes');
    document.getElementById('globalSearch').value = restaurantName;
    smartSearch(restaurantName);
}

// Show insight detail - opens relevant view based on insight type
function showInsightDetail(insightType) {
    switch (insightType) {
        case 'bestDay':
            // Find best day and open it
            const days = appData.days;
            const bestDayIdx = days.reduce((maxIdx, day, idx, arr) => 
                day.stats.total_earnings > arr[maxIdx].stats.total_earnings ? idx : maxIdx, 0);
            openDay(bestDayIdx);
            break;
        case 'topRestaurant':
            // Search for top restaurant
            const topRestEl = document.getElementById('statsTopRestaurant');
            if (topRestEl && topRestEl.textContent !== '-') {
                searchRestaurant(topRestEl.textContent.replace('...', ''));
            }
            break;
        case 'bestHours':
            // Navigate to weeks page to see hourly patterns
            showPage('weeks');
            break;
        case 'bestWeekday':
            // Navigate to routes filtered by best weekday
            const bestWeekdayEl = document.getElementById('statsBestWeekday');
            if (bestWeekdayEl && bestWeekdayEl.textContent !== '-') {
                showPage('routes');
                document.getElementById('globalSearch').value = bestWeekdayEl.textContent.toLowerCase();
                smartSearch(bestWeekdayEl.textContent.toLowerCase());
            }
            break;
    }
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

// ========== WEEKS PAGE ==========
let weekPageStart = null;

function getLatestDataWeek() {
    // Get the most recent week from the data (for demo purposes, data is from 2025)
    if (appData && appData.days && appData.days.length > 0) {
        const latestDate = new Date(appData.days[appData.days.length - 1].date + 'T12:00:00');
        return getWeekStart(latestDate);
    }
    return getWeekStart(new Date());
}

function renderWeeksPage() {
    if (!weekPageStart) {
        weekPageStart = getLatestDataWeek();
    }
    updateWeekPageDisplay();
    renderWeekDaysGrid();
}

function navigateWeekPage(direction) {
    if (!weekPageStart) {
        weekPageStart = getLatestDataWeek();
    }
    weekPageStart = new Date(weekPageStart);
    weekPageStart.setDate(weekPageStart.getDate() + (direction * 7));
    updateWeekPageDisplay();
    renderWeekDaysGrid();
}

function goToCurrentWeekPage() {
    weekPageStart = getLatestDataWeek();
    updateWeekPageDisplay();
    renderWeekDaysGrid();
}

function updateWeekPageDisplay() {
    if (!weekPageStart || !appData) return;
    
    const weekEnd = getWeekEnd(weekPageStart);
    
    // Format date range
    const startMonth = weekPageStart.toLocaleDateString('en-US', { month: 'short' });
    const startDay = weekPageStart.getDate();
    const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
    const endDay = weekEnd.getDate();
    const year = weekEnd.getFullYear();
    
    let dateRange;
    if (startMonth === endMonth) {
        dateRange = `${startMonth} ${startDay} - ${endDay}, ${year}`;
    } else {
        dateRange = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
    
    document.getElementById('weekPageDates').textContent = dateRange;
    
    // Calculate stats
    let earnings = 0;
    let trips = 0;
    let miles = 0;
    let daysWorked = 0;
    
    appData.days.forEach(day => {
        const dayDate = new Date(day.date + 'T12:00:00');
        if (dayDate >= weekPageStart && dayDate <= weekEnd) {
            earnings += day.stats.total_earnings;
            trips += day.stats.trip_count;
            miles += day.stats.total_distance;
            daysWorked++;
        }
    });
    
    const avgPerTrip = trips > 0 ? earnings / trips : 0;
    
    document.getElementById('weekPageEarnings').textContent = '$' + earnings.toFixed(2);
    document.getElementById('weekPageTrips').textContent = trips;
    document.getElementById('weekPageMiles').textContent = miles.toFixed(1);
    document.getElementById('weekPageDays').textContent = daysWorked;
    document.getElementById('weekPageAvg').textContent = '$' + avgPerTrip.toFixed(2);
}

function renderWeekDaysGrid() {
    if (!weekPageStart || !appData) return;
    
    const container = document.getElementById('weekDaysGrid');
    const weekEnd = getWeekEnd(weekPageStart);
    
    // Get days in this week
    const weekDays = [];
    const currentDate = new Date(weekPageStart);
    
    while (currentDate <= weekEnd) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayData = appData.days.find(d => d.date === dateStr);
        weekDays.push({
            date: new Date(currentDate),
            dateStr: dateStr,
            data: dayData
        });
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Find max earnings for bar scaling
    const maxEarnings = Math.max(...weekDays.filter(d => d.data).map(d => d.data.stats.total_earnings), 1);
    
    let html = '';
    
    weekDays.forEach((day, idx) => {
        const weekday = day.date.toLocaleDateString('en-US', { weekday: 'long' });
        const monthDay = day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const isToday = day.dateStr === new Date().toISOString().split('T')[0];
        
        if (day.data) {
            const barWidth = (day.data.stats.total_earnings / maxEarnings) * 100;
            const realIdx = appData.days.findIndex(d => d.date === day.dateStr);
            
            html += `
                <div class="week-day-card${isToday ? ' today' : ''}" onclick="openDay(${realIdx})">
                    <div class="week-day-header">
                        <span class="week-day-name">${weekday}</span>
                        <span class="week-day-date">${monthDay}</span>
                    </div>
                    <div class="week-day-stats">
                        <div class="week-day-earnings">$${day.data.stats.total_earnings.toFixed(2)}</div>
                        <div class="week-day-bar">
                            <div class="week-day-bar-fill" style="width: ${barWidth}%"></div>
                        </div>
                        <div class="week-day-details">
                            <span>${day.data.stats.trip_count} trips</span>
                            <span>${day.data.stats.total_distance.toFixed(1)} mi</span>
                            <span>$${day.data.stats.total_tips.toFixed(2)} tips</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="week-day-card empty${isToday ? ' today' : ''}">
                    <div class="week-day-header">
                        <span class="week-day-name">${weekday}</span>
                        <span class="week-day-date">${monthDay}</span>
                    </div>
                    <div class="week-day-empty">
                        <span>No trips recorded</span>
                    </div>
                </div>
            `;
        }
    });
    
    container.innerHTML = html;
}

// Page navigation
function showPage(page) {
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('mapView').classList.remove('active');

    if (page === 'home') document.getElementById('pageHome').classList.add('active');
    else if (page === 'weeks') {
        document.getElementById('pageWeeks').classList.add('active');
        renderWeeksPage();
    }
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

    // Toggle nav elements based on page
    updateNavForPage(page);

    if (map) { map.remove(); map = null; }
    mapMarkers = [];
    activeTrip = null;
}

// Update nav visibility based on current page
function updateNavForPage(page) {
    const navInfo = document.getElementById('navInfo');
    const navAuth = document.getElementById('navAuth');
    
    if (page === 'home') {
        // On home page: show auth buttons, hide stats
        if (navInfo) navInfo.style.display = 'none';
        if (navAuth) navAuth.style.display = 'flex';
        document.body.classList.add('on-home');
    } else {
        // On other pages: show stats, hide auth
        if (navInfo) navInfo.style.display = 'flex';
        if (navAuth) navAuth.style.display = 'none';
        document.body.classList.remove('on-home');
    }
}

// Auth functions
function showLogin() {
    openOnboarding();
}

function showSignup() {
    openOnboarding();
}

// ========== ONBOARDING FLOW ==========
let currentOnboardingStep = 1;
let connectedPlatform = null;

function openOnboarding() {
    document.getElementById('onboardingModal').classList.add('active');
    currentOnboardingStep = 1;
    updateOnboardingUI();
}

function closeOnboarding() {
    document.getElementById('onboardingModal').classList.remove('active');
    // Reset state
    currentOnboardingStep = 1;
    connectedPlatform = null;
    updateOnboardingUI();
}

function goToStep(step) {
    currentOnboardingStep = step;
    updateOnboardingUI();
}

function updateOnboardingUI() {
    // Update progress indicators
    document.querySelectorAll('.progress-step').forEach((el, idx) => {
        const stepNum = idx + 1;
        el.classList.remove('active', 'completed');
        if (stepNum === currentOnboardingStep) {
            el.classList.add('active');
        } else if (stepNum < currentOnboardingStep) {
            el.classList.add('completed');
        }
    });
    
    // Show correct step content
    document.querySelectorAll('.onboarding-step').forEach((el, idx) => {
        el.classList.toggle('active', idx + 1 === currentOnboardingStep);
    });
}

function connectPlatform(platform) {
    if (platform === 'doordash' || platform === 'instacart') {
        showToast('Coming soon! Uber is currently the only supported platform.');
        return;
    }
    
    connectedPlatform = platform;
    
    // Simulate OAuth flow with Uber
    if (platform === 'uber') {
        showToast('Connecting to Uber...');
        
        // Simulate OAuth callback after 1.5 seconds
        setTimeout(() => {
            // Simulate getting driver data from Uber
            simulateUberAuth();
        }, 1500);
    }
}

function simulateUberAuth() {
    // In a real app, this would be an OAuth flow
    // For demo, we'll populate with sample data
    
    const driverData = {
        name: 'Demo Driver',
        email: 'driver@example.com',
        platform: 'Uber Eats',
        trips: '1,045',
        since: 'Aug 2025',
        rating: '4.95'
    };
    
    // Populate verification step
    document.getElementById('verifyName').textContent = driverData.name;
    document.getElementById('verifyEmail').textContent = driverData.email;
    document.getElementById('verifyPlatform').textContent = driverData.platform;
    document.getElementById('verifyTrips').textContent = driverData.trips;
    document.getElementById('verifySince').textContent = driverData.since;
    document.getElementById('verifyRating').textContent = driverData.rating;
    
    // Move to verification step
    goToStep(2);
    showToast('Connected to Uber successfully!');
}

function skipToManual() {
    // Skip directly to setup step for manual users
    connectedPlatform = null;
    
    // Set manual user defaults
    document.getElementById('verifyName').textContent = 'Guest Driver';
    document.getElementById('verifyEmail').textContent = 'Manual entry mode';
    document.getElementById('verifyPlatform').textContent = 'Manual';
    document.getElementById('verifyTrips').textContent = '-';
    document.getElementById('verifySince').textContent = '-';
    document.getElementById('verifyRating').textContent = '-';
    
    goToStep(3);
}

function completeOnboarding() {
    // Save preferences
    const weeklyGoal = document.getElementById('setupGoal').value || 500;
    const mileageRate = document.getElementById('setupMileage').value || 0.67;
    const darkMode = document.getElementById('setupDarkMode').checked;
    
    // Store in localStorage
    localStorage.setItem('lml_weeklyGoal', weeklyGoal);
    localStorage.setItem('lml_mileageRate', mileageRate);
    localStorage.setItem('lml_darkMode', darkMode);
    localStorage.setItem('lml_onboarded', 'true');
    localStorage.setItem('lml_platform', connectedPlatform || 'manual');
    
    // Close modal and go to dashboard
    closeOnboarding();
    showPage('routes');
    showToast('Welcome to LastMile Ledger! 🎉');
}

// Check if user has completed onboarding
function checkOnboardingStatus() {
    return localStorage.getItem('lml_onboarded') === 'true';
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
        <div class="trip-card" data-trip-id="${i}" data-search="${(t.restaurant || '').toLowerCase()} ${(t.pickup_address || '').toLowerCase()} ${(t.dropoff_address || '').toLowerCase()}" onclick="selectTrip(${i})">
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
                    <span>${sanitizePickupAddress(t.pickup_address, t.restaurant).substring(0, 45)}${sanitizePickupAddress(t.pickup_address, t.restaurant).length > 45 ? '...' : ''}</span>
                </div>
                <div class="trip-addr">
                    <div class="trip-addr-icon dropoff">D</div>
                    <span>${maskDropoffAddress(t.dropoff_address).substring(0, 45)}${maskDropoffAddress(t.dropoff_address).length > 45 ? '...' : ''}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Toggle detail panel pickup address
function toggleDetailPickup(element) {
    const fullAddress = element.dataset.fullAddress;
    const restaurant = element.dataset.restaurant;
    const isShowingAddress = element.classList.toggle('showing-address');
    element.textContent = isShowingAddress ? sanitizePickupAddress(fullAddress, restaurant) : restaurant;
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
    
    // Pickup: show restaurant name, click to toggle full address, with map link
    const pickupEl = document.getElementById('detailPickup');
    const cleanPickupAddr = sanitizePickupAddress(trip.pickup_address, trip.restaurant);
    pickupEl.innerHTML = `<span class="pickup-toggle-detail" onclick="toggleDetailPickup(this)" data-full-address="${escapeHtml(trip.pickup_address)}" data-restaurant="${escapeHtml(trip.restaurant)}">${escapeHtml(trip.restaurant)}</span> <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanPickupAddr)}" target="_blank" rel="noopener" class="map-link" title="Open in Maps">&#x1F5FA;</a>`;
    
    document.getElementById('detailDropoff').textContent = maskDropoffAddress(trip.dropoff_address);
    
    // Show UUID link if available (feature shelved for v2)
    const uuidSection = document.getElementById('detailUuidSection');
    const uuidLink = document.getElementById('detailUuidLink');
    if (FEATURE_SHOW_TRIP_UUID && trip.trip_uuid && trip.trip_uuid !== 'N/A') {
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

// Generate summary report - LaTeX style
function generateSummaryReport(stats) {
    const avgPerTrip = stats.total_trips > 0 ? stats.total_earnings / stats.total_trips : 0;
    const avgPerDay = stats.total_days > 0 ? stats.total_earnings / stats.total_days : 0;
    const avgPerMile = stats.total_distance > 0 ? stats.total_earnings / stats.total_distance : 0;
    const tipPercent = stats.total_earnings > 0 ? (stats.total_tips / stats.total_earnings * 100) : 0;
    const mileageDeduction = stats.total_distance * 0.67;
    const taxableIncome = Math.max(stats.total_earnings - mileageDeduction, 0);
    
    // Find date range
    const dates = appData.days.map(d => new Date(d.date + 'T12:00:00')).sort((a, b) => a - b);
    const startDate = dates.length > 0 ? dates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-';
    const endDate = dates.length > 0 ? dates[dates.length - 1].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-';
    
    return `
        <div class="print-document print-latex">
            <div class="latex-header">
                <h1 class="latex-title">Delivery Earnings Report</h1>
                <p class="latex-subtitle">LastMile Ledger — Comprehensive Summary</p>
                <p class="latex-meta">${startDate} through ${endDate}</p>
            </div>
            
            <div class="latex-abstract">
                <strong>Abstract.</strong> This report summarizes ${stats.total_trips.toLocaleString()} deliveries 
                completed over ${stats.total_days} active days, covering ${Math.round(stats.total_distance).toLocaleString()} miles 
                with total earnings of ${formatCurrency(stats.total_earnings)}.
            </div>
            
            <div class="latex-section">
                <h2>Executive Summary</h2>
                <table class="latex-table latex-summary-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Value</th>
                            <th>Metric</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Total Earnings</td>
                            <td class="number">${formatCurrency(stats.total_earnings)}</td>
                            <td>Total Deliveries</td>
                            <td class="number">${stats.total_trips.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td>Base Fares</td>
                            <td class="number">${formatCurrency(stats.total_earnings - stats.total_tips)}</td>
                            <td>Total Miles</td>
                            <td class="number">${Math.round(stats.total_distance).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td>Tips Received</td>
                            <td class="number">${formatCurrency(stats.total_tips)}</td>
                            <td>Active Days</td>
                            <td class="number">${stats.total_days}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="latex-section">
                <h2>Performance Analysis</h2>
                <p>Table 2 presents key performance indicators derived from the delivery data.</p>
                <table class="latex-table">
                    <thead>
                        <tr>
                            <th>Performance Metric</th>
                            <th>Value</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Earnings per Delivery</td>
                            <td class="number">${formatCurrency(avgPerTrip)}</td>
                            <td>Average revenue per completed delivery</td>
                        </tr>
                        <tr>
                            <td>Earnings per Day</td>
                            <td class="number">${formatCurrency(avgPerDay)}</td>
                            <td>Average daily revenue on active days</td>
                        </tr>
                        <tr>
                            <td>Earnings per Mile</td>
                            <td class="number">${formatCurrency(avgPerMile)}</td>
                            <td>Revenue efficiency per mile driven</td>
                        </tr>
                        <tr>
                            <td>Deliveries per Day</td>
                            <td class="number">${(stats.total_trips / stats.total_days).toFixed(1)}</td>
                            <td>Average delivery volume per active day</td>
                        </tr>
                        <tr>
                            <td>Tip Percentage</td>
                            <td class="number">${tipPercent.toFixed(1)}%</td>
                            <td>Tips as percentage of total earnings</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="latex-section">
                <h2>Tax Considerations</h2>
                <p>The following estimates are based on the 2024 IRS standard mileage rate of $0.67 per mile for business use of a vehicle.</p>
                <table class="latex-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Gross Earnings</td>
                            <td class="number">${formatCurrency(stats.total_earnings)}</td>
                        </tr>
                        <tr>
                            <td>Mileage Deduction (${Math.round(stats.total_distance).toLocaleString()} mi × $0.67)</td>
                            <td class="number">(${formatCurrency(mileageDeduction)})</td>
                        </tr>
                        <tr class="latex-total">
                            <td><em>Estimated Taxable Income</em></td>
                            <td class="number"><em>${formatCurrency(taxableIncome)}</em></td>
                        </tr>
                    </tbody>
                </table>
                <p class="latex-note"><em>Note:</em> This estimate is for informational purposes only. Consult a qualified tax professional for actual filing requirements and additional deductions.</p>
            </div>
            
            <div class="latex-footer">
                <p>Generated by LastMile Ledger on ${getReportDate()}</p>
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
    
    const avgPerTrip = totalTrips > 0 ? totalEarnings / totalTrips : 0;
    const avgPerDay = appData.stats.total_days > 0 ? totalEarnings / appData.stats.total_days : 0;
    const avgPerMile = totalDistance > 0 ? totalEarnings / totalDistance : 0;
    
    return `
        <div class="print-document print-latex">
            <div class="latex-header">
                <h1 class="latex-title">Monthly Performance Report</h1>
                <p class="latex-subtitle">LastMile Ledger — Period Analysis</p>
                <p class="latex-meta">${months.length} Month${months.length !== 1 ? 's' : ''} of Activity</p>
            </div>
            
            <div class="latex-abstract">
                <strong>Abstract.</strong> This report provides a month-by-month breakdown of delivery activity, 
                summarizing ${totalTrips.toLocaleString()} total deliveries across ${appData.stats.total_days} active days 
                with cumulative earnings of ${formatCurrency(totalEarnings)}.
            </div>
            
            <div class="latex-section">
                <h2>Summary Statistics</h2>
                <table class="latex-table latex-summary-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Value</th>
                            <th>Metric</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Total Earnings</td>
                            <td class="number">${formatCurrency(totalEarnings)}</td>
                            <td>Avg. per Trip</td>
                            <td class="number">${formatCurrency(avgPerTrip)}</td>
                        </tr>
                        <tr>
                            <td>Total Distance</td>
                            <td class="number">${Math.round(totalDistance).toLocaleString()} mi</td>
                            <td>Avg. per Day</td>
                            <td class="number">${formatCurrency(avgPerDay)}</td>
                        </tr>
                        <tr>
                            <td>Total Tips</td>
                            <td class="number">${formatCurrency(totalTips)}</td>
                            <td>Avg. per Mile</td>
                            <td class="number">${formatCurrency(avgPerMile)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="latex-section">
                <h2>Monthly Breakdown</h2>
                <p>Table 2 presents detailed monthly statistics for the reporting period.</p>
                <table class="latex-table">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th class="number">Days</th>
                            <th class="number">Deliveries</th>
                            <th class="number">Miles</th>
                            <th class="number">Tips</th>
                            <th class="number">Earnings</th>
                            <th class="number">$/Trip</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                    <tfoot>
                        <tr class="latex-total">
                            <td><em>Total</em></td>
                            <td class="number"><em>${appData.stats.total_days}</em></td>
                            <td class="number"><em>${totalTrips.toLocaleString()}</em></td>
                            <td class="number"><em>${Math.round(totalDistance).toLocaleString()}</em></td>
                            <td class="number"><em>${formatCurrency(totalTips)}</em></td>
                            <td class="number"><em>${formatCurrency(totalEarnings)}</em></td>
                            <td class="number"><em>${formatCurrency(avgPerTrip)}</em></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="latex-footer">
                <p>Generated by LastMile Ledger on ${getReportDate()}</p>
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
    
    // Find date range
    const dates = appData.days.map(d => new Date(d.date + 'T12:00:00')).sort((a, b) => a - b);
    const startDate = dates.length > 0 ? dates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-';
    const endDate = dates.length > 0 ? dates[dates.length - 1].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-';
    
    return `
        <div class="print-document print-latex print-latex-compact">
            <div class="latex-header latex-header-compact">
                <h1 class="latex-title">Complete Delivery Log</h1>
                <p class="latex-meta">${startDate} — ${endDate} · ${appData.stats.total_trips.toLocaleString()} Deliveries · LastMile Ledger</p>
            </div>
            
            <div class="latex-section">
                <table class="latex-table latex-trips-table">
                    <thead>
                        <tr>
                            <th class="number">#</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Restaurant</th>
                            <th class="number">Mi</th>
                            <th class="number">Fare</th>
                            <th class="number">Tip</th>
                            <th class="number">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tripRows}
                    </tbody>
                    <tfoot>
                        <tr class="latex-total">
                            <td colspan="4"><em>Totals</em></td>
                            <td class="number"><em>${Math.round(appData.stats.total_distance).toLocaleString()}</em></td>
                            <td class="number"><em>${formatCurrency(appData.stats.total_earnings - appData.stats.total_tips)}</em></td>
                            <td class="number"><em>${formatCurrency(appData.stats.total_tips)}</em></td>
                            <td class="number"><em>${formatCurrency(appData.stats.total_earnings)}</em></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="latex-footer">
                <p>Generated by LastMile Ledger on ${getReportDate()}</p>
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
    
    const avgPerTrip = day.stats.trip_count > 0 ? day.stats.total_earnings / day.stats.trip_count : 0;
    const tipPercent = day.stats.total_earnings > 0 ? (day.stats.total_tips / day.stats.total_earnings * 100) : 0;
    const avgPerMile = day.stats.total_distance > 0 ? day.stats.total_earnings / day.stats.total_distance : 0;
    
    const content = `
        <div class="print-document print-latex">
            <div class="latex-header">
                <h1 class="latex-title">Daily Route Report</h1>
                <p class="latex-subtitle">LastMile Ledger</p>
                <p class="latex-meta">${dateStr}</p>
            </div>
            
            <div class="latex-section">
                <h2>Day Summary</h2>
                <table class="latex-table latex-summary-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Value</th>
                            <th>Metric</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Total Earnings</td>
                            <td class="number">${formatCurrency(day.stats.total_earnings)}</td>
                            <td>Deliveries</td>
                            <td class="number">${day.stats.trip_count}</td>
                        </tr>
                        <tr>
                            <td>Tips</td>
                            <td class="number">${formatCurrency(day.stats.total_tips)}</td>
                            <td>Distance</td>
                            <td class="number">${day.stats.total_distance.toFixed(1)} mi</td>
                        </tr>
                        <tr>
                            <td>Avg. per Trip</td>
                            <td class="number">${formatCurrency(avgPerTrip)}</td>
                            <td>Avg. per Mile</td>
                            <td class="number">${formatCurrency(avgPerMile)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            ${mapImage ? `
            <div class="latex-section">
                <h2>Route Visualization</h2>
                <div class="latex-figure">
                    <img src="${mapImage}" alt="Route Map">
                    <p class="latex-caption">Figure 1: Delivery route for ${dateStr}</p>
                </div>
            </div>
            ` : ''}
            
            <div class="latex-section">
                <h2>Trip Details</h2>
                <p>All deliveries completed on this date.</p>
                <table class="latex-table">
                    <thead>
                        <tr>
                            <th class="number">#</th>
                            <th>Time</th>
                            <th>Restaurant</th>
                            <th class="number">Miles</th>
                            <th class="number">Fare</th>
                            <th class="number">Tip</th>
                            <th class="number">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tripRows}
                    </tbody>
                    <tfoot>
                        <tr class="latex-total">
                            <td colspan="3"><em>Totals</em></td>
                            <td class="number"><em>${day.stats.total_distance.toFixed(1)}</em></td>
                            <td class="number"><em>${formatCurrency(day.stats.total_earnings - day.stats.total_tips)}</em></td>
                            <td class="number"><em>${formatCurrency(day.stats.total_tips)}</em></td>
                            <td class="number"><em>${formatCurrency(day.stats.total_earnings)}</em></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="latex-footer">
                <p>Generated by LastMile Ledger on ${getReportDate()}</p>
            </div>
        </div>
    `;
    
    printContent(content);
}

// Print trip ticket - LaTeX style receipt
function printTripTicket() {
    if (activeTrip === null || currentDayIndex < 0) return;
    
    const trip = appData.days[currentDayIndex].trips[activeTrip];
    const day = appData.days[currentDayIndex];
    const date = new Date(day.date + 'T12:00:00');
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    
    const content = `
        <div class="print-document print-latex print-latex-receipt print-receipt-compact">
            <div class="latex-header latex-header-compact">
                <h1 class="latex-title">Delivery Receipt</h1>
                <p class="latex-meta">Trip #${activeTrip + 1} — ${dateStr}</p>
            </div>
            
            <div class="latex-section">
                <h2>Trip Details</h2>
                <table class="latex-table latex-table-compact">
                    <tbody>
                        <tr>
                            <td><strong>Restaurant</strong></td>
                            <td>${trip.restaurant}</td>
                        </tr>
                        <tr>
                            <td><strong>Time</strong></td>
                            <td>${trip.request_time} — ${trip.dropoff_time} (${trip.duration})</td>
                        </tr>
                        <tr>
                            <td><strong>Distance</strong></td>
                            <td>${trip.distance.toFixed(1)} miles</td>
                        </tr>
                        <tr>
                            <td><strong>Pickup</strong></td>
                            <td>${trip.pickup_address}</td>
                        </tr>
                        <tr>
                            <td><strong>Dropoff</strong></td>
                            <td>${maskDropoffAddress(trip.dropoff_address)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="latex-section">
                <h2>Earnings</h2>
                <table class="latex-table latex-table-compact">
                    <tbody>
                        <tr>
                            <td>Base Fare</td>
                            <td class="number">${formatCurrency(trip.base_fare)}</td>
                        </tr>
                        ${trip.tip > 0 ? `
                        <tr>
                            <td>Tip</td>
                            <td class="number">${formatCurrency(trip.tip)}</td>
                        </tr>
                        ` : ''}
                        ${trip.incentive > 0 ? `
                        <tr>
                            <td>Incentive</td>
                            <td class="number">${formatCurrency(trip.incentive)}</td>
                        </tr>
                        ` : ''}
                        ${trip.order_refund > 0 ? `
                        <tr>
                            <td>Refund</td>
                            <td class="number">${formatCurrency(trip.order_refund)}</td>
                        </tr>
                        ` : ''}
                    </tbody>
                    <tfoot>
                        <tr class="latex-total">
                            <td><strong>Total</strong></td>
                            <td class="number"><strong>${formatCurrency(trip.total_pay)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="latex-footer">
                <p>LastMile Ledger — ${getReportDate()}</p>
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

// ========== REFUNDS MANAGEMENT ==========

// Store for current refund being viewed
let currentRefundId = null;
let pendingReceiptData = null;

// Load manual refunds from localStorage
function loadManualRefunds() {
    return safeGetJSON('courierRoutes_refunds') || [];
}

// Save manual refunds to localStorage
function saveRefunds(refunds) {
    localStorage.setItem('courierRoutes_refunds', JSON.stringify(refunds));
}

// Get refunds from trip data (order_refund field)
function getTripRefunds() {
    const tripRefunds = [];
    appData.days.forEach(day => {
        day.trips.forEach((trip, tripIndex) => {
            if (trip.order_refund && trip.order_refund > 0) {
                tripRefunds.push({
                    id: `trip_${day.date}_${tripIndex}`,
                    date: day.date,
                    platform: 'Uber Eats', // From trip data source
                    amount: trip.order_refund,
                    reason: 'Order refund',
                    notes: trip.restaurant,
                    status: 'resolved', // Trip refunds are already processed
                    receipt: null,
                    fromTrip: true, // Flag to identify trip-based refunds
                    tripData: {
                        restaurant: trip.restaurant,
                        time: trip.request_time,
                        total_pay: trip.total_pay,
                        service_type: trip.service_type
                    }
                });
            }
        });
    });
    return tripRefunds;
}

// Load all refunds (trip-based + manual)
function loadAllRefunds() {
    const tripRefunds = getTripRefunds();
    const manualRefunds = loadManualRefunds();
    return [...tripRefunds, ...manualRefunds];
}

// Render the refunds section in Reports
function renderRefundsSection() {
    const allRefunds = loadAllRefunds();
    const manualRefunds = loadManualRefunds();
    
    // Calculate summary stats
    const totalCount = allRefunds.length;
    const totalValue = allRefunds.reduce((sum, r) => sum + (r.amount || 0), 0);
    const pendingCount = allRefunds.filter(r => r.status === 'pending').length;
    const resolvedCount = allRefunds.filter(r => r.status === 'resolved').length;
    
    // Update summary stats
    document.getElementById('totalRefundsCount').textContent = totalCount;
    document.getElementById('totalRefundsValue').textContent = '$' + totalValue.toFixed(2);
    document.getElementById('pendingRefundsCount').textContent = pendingCount;
    document.getElementById('resolvedRefundsCount').textContent = resolvedCount;
    
    // Render refunds list
    const container = document.getElementById('refundsList');
    
    if (allRefunds.length === 0) {
        container.innerHTML = '<div class="refunds-empty">No refunds recorded yet. Click "+ Add Refund" to track one.</div>';
        return;
    }
    
    // Sort by date descending
    const sortedRefunds = [...allRefunds].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    container.innerHTML = sortedRefunds.map(refund => {
        const date = new Date(refund.date + 'T12:00:00');
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const hasReceipt = refund.receipt ? true : false;
        const isFromTrip = refund.fromTrip ? true : false;
        
        return `
            <div class="refund-row ${isFromTrip ? 'from-trip' : ''}" onclick="viewRefund('${refund.id}')">
                <div class="refund-date">${dateStr}</div>
                <div class="refund-info">
                    <span class="refund-platform">${refund.platform}${isFromTrip ? ' <span class="refund-source-badge">Trip</span>' : ''}</span>
                    <span class="refund-reason">${isFromTrip ? refund.notes : refund.reason}</span>
                </div>
                <div class="refund-amount">-$${refund.amount.toFixed(2)}</div>
                <span class="refund-status ${refund.status}">${refund.status}</span>
                <span class="refund-receipt-indicator ${hasReceipt ? 'has-receipt' : ''}" title="${hasReceipt ? 'Has receipt' : 'No receipt'}">
                    ${hasReceipt ? 'IMG' : '-'}
                </span>
            </div>
        `;
    }).join('');
}

// Show add refund modal
function showAddRefundModal() {
    const modal = document.getElementById('addRefundModal');
    modal.classList.add('active');
    
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('refundDate').value = today;
    
    // Reset form
    document.getElementById('addRefundForm').reset();
    document.getElementById('refundDate').value = today;
    pendingReceiptData = null;
    
    // Reset receipt preview
    document.getElementById('receiptPlaceholder').style.display = 'flex';
    document.getElementById('receiptPreview').style.display = 'none';
    document.getElementById('receiptPreview').innerHTML = '';
}

// Close add refund modal
function closeAddRefundModal() {
    const modal = document.getElementById('addRefundModal');
    modal.classList.remove('active');
    pendingReceiptData = null;
}

// Handle receipt file upload
function handleReceiptUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        pendingReceiptData = {
            name: file.name,
            type: file.type,
            data: e.target.result
        };
        
        // Show preview
        const placeholder = document.getElementById('receiptPlaceholder');
        const preview = document.getElementById('receiptPreview');
        
        placeholder.style.display = 'none';
        preview.style.display = 'flex';
        
        if (file.type.startsWith('image/')) {
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Receipt preview">
                <span class="file-name">${file.name}</span>
                <button type="button" class="file-remove" onclick="removeReceipt(event)">Remove</button>
            `;
        } else {
            preview.innerHTML = `
                <span class="file-upload-icon">PDF</span>
                <span class="file-name">${file.name}</span>
                <button type="button" class="file-remove" onclick="removeReceipt(event)">Remove</button>
            `;
        }
    };
    reader.readAsDataURL(file);
}

// Remove receipt from upload
function removeReceipt(event) {
    event.stopPropagation();
    pendingReceiptData = null;
    
    document.getElementById('refundReceipt').value = '';
    document.getElementById('receiptPlaceholder').style.display = 'flex';
    document.getElementById('receiptPreview').style.display = 'none';
    document.getElementById('receiptPreview').innerHTML = '';
}

// Submit new refund
function submitRefund(event) {
    event.preventDefault();
    
    const refund = {
        id: `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: document.getElementById('refundDate').value,
        platform: document.getElementById('refundPlatform').value,
        amount: parseFloat(document.getElementById('refundAmount').value) || 0,
        reason: document.getElementById('refundReason').value,
        notes: document.getElementById('refundNotes').value.trim(),
        status: document.getElementById('refundStatus').value,
        receipt: pendingReceiptData,
        createdAt: new Date().toISOString()
    };
    
    // Save to localStorage
    const refunds = loadManualRefunds();
    refunds.push(refund);
    saveRefunds(refunds);
    
    // Close modal and refresh
    closeAddRefundModal();
    renderRefundsSection();
    showToast('Refund recorded successfully!', 'success');
}

// View refund details
function viewRefund(refundId) {
    // Check both trip refunds and manual refunds
    const allRefunds = loadAllRefunds();
    const refund = allRefunds.find(r => r.id === refundId);
    
    if (!refund) return;
    
    currentRefundId = refundId;
    const isFromTrip = refund.fromTrip || false;
    
    const modal = document.getElementById('viewRefundModal');
    const body = document.getElementById('viewRefundBody');
    const deleteBtn = document.getElementById('deleteRefundBtn');
    
    // Hide delete button for trip-based refunds
    if (deleteBtn) {
        deleteBtn.style.display = isFromTrip ? 'none' : 'block';
    }
    
    const date = new Date(refund.date + 'T12:00:00');
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    
    let receiptHtml = '';
    if (refund.receipt) {
        if (refund.receipt.type && refund.receipt.type.startsWith('image/')) {
            receiptHtml = `
                <div class="refund-receipt-view">
                    <div class="refund-detail-label">Receipt</div>
                    <img src="${refund.receipt.data}" alt="Receipt">
                </div>
            `;
        } else {
            receiptHtml = `
                <div class="refund-receipt-view">
                    <div class="refund-detail-label">Receipt</div>
                    <a href="${refund.receipt.data}" download="${refund.receipt.name}">${refund.receipt.name} (Download)</a>
                </div>
            `;
        }
    }
    
    // Additional trip info for trip-based refunds
    let tripInfoHtml = '';
    if (isFromTrip && refund.tripData) {
        tripInfoHtml = `
            <div class="refund-detail-item full-width">
                <span class="refund-detail-label">Trip Details</span>
                <span class="refund-detail-value">${refund.tripData.restaurant} at ${refund.tripData.time} - Total pay: $${refund.tripData.total_pay.toFixed(2)}</span>
            </div>
        `;
    }
    
    body.innerHTML = `
        <div class="refund-detail-grid">
            <div class="refund-detail-item">
                <span class="refund-detail-label">Date</span>
                <span class="refund-detail-value">${dateStr}</span>
            </div>
            <div class="refund-detail-item">
                <span class="refund-detail-label">Amount</span>
                <span class="refund-detail-value amount">-$${refund.amount.toFixed(2)}</span>
            </div>
            <div class="refund-detail-item">
                <span class="refund-detail-label">Platform</span>
                <span class="refund-detail-value">${refund.platform}${isFromTrip ? ' <span class="refund-source-badge">From Trip Data</span>' : ''}</span>
            </div>
            <div class="refund-detail-item">
                <span class="refund-detail-label">Status</span>
                <span class="refund-status ${refund.status}">${refund.status}</span>
            </div>
            <div class="refund-detail-item full-width">
                <span class="refund-detail-label">${isFromTrip ? 'Restaurant' : 'Reason'}</span>
                <span class="refund-detail-value">${isFromTrip ? refund.notes : refund.reason}</span>
            </div>
            ${tripInfoHtml}
            ${!isFromTrip && refund.notes ? `
            <div class="refund-detail-item full-width">
                <span class="refund-detail-label">Notes</span>
                <span class="refund-detail-value">${refund.notes}</span>
            </div>
            ` : ''}
        </div>
        ${receiptHtml}
    `;
    
    modal.classList.add('active');
}

// Close view refund modal
function closeViewRefundModal() {
    const modal = document.getElementById('viewRefundModal');
    modal.classList.remove('active');
    currentRefundId = null;
}

// Delete current refund (only for manual refunds)
function deleteCurrentRefund() {
    if (!currentRefundId) return;
    
    // Don't allow deleting trip-based refunds
    if (currentRefundId.startsWith('trip_')) {
        showToast('Cannot delete trip-based refunds', 'error');
        return;
    }
    
    if (!confirm('Are you sure you want to delete this refund record?')) return;
    
    const refunds = loadManualRefunds();
    const filtered = refunds.filter(r => r.id !== currentRefundId);
    saveRefunds(filtered);
    
    closeViewRefundModal();
    renderRefundsSection();
    showToast('Refund deleted', 'success');
}

// Expose functions to window for HTML onclick handlers
window.showPage = showPage;
window.showLogin = showLogin;
window.showSignup = showSignup;
window.openTripEntry = openTripEntry;
window.closeTripEntry = closeTripEntry;
window.openTripEntryForDay = openTripEntryForDay;
window.navigateWeekPage = navigateWeekPage;
window.goToCurrentWeekPage = goToCurrentWeekPage;
window.filterByMonth = filterByMonth;
window.showInsightDetail = showInsightDetail;
window.navigateDay = navigateDay;
window.closeDetail = closeDetail;
window.printTripTicket = printTripTicket;
window.printDayReport = printDayReport;
window.printReport = printReport;
window.closeOnboarding = closeOnboarding;
window.goToStep = goToStep;
window.completeOnboarding = completeOnboarding;
window.skipToManual = skipToManual;
window.connectPlatform = connectPlatform;
window.openBatchUpload = openBatchUpload;
window.closeBatchUpload = closeBatchUpload;
window.importBatchTrips = importBatchTrips;
window.showAddRefundModal = showAddRefundModal;
window.closeAddRefundModal = closeAddRefundModal;
window.closeViewRefundModal = closeViewRefundModal;
window.deleteCurrentRefund = deleteCurrentRefund;
window.openDay = openDay;
window.filterEfficiencyTrips = filterEfficiencyTrips;
window.searchRestaurant = searchRestaurant;
window.selectTrip = selectTrip;
window.toggleDetailPickup = toggleDetailPickup;
window.viewRefund = viewRefund;
window.removeReceipt = removeReceipt;
window.globalSearchHandler = globalSearchHandler;
window.submitRefund = submitRefund;
window.saveTripEntry = saveTripEntry;

// Initialize app on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
