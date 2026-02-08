import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function fetchAllTrips() {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('timestamp_start', { ascending: true });

  if (error) throw error;
  return data;
}

export async function fetchDailyStats() {
  const { data, error } = await supabase
    .from('daily_stats')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchRestaurantStats() {
  const { data, error } = await supabase
    .from('restaurant_stats')
    .select('*')
    .order('trip_count', { ascending: false });

  if (error) throw error;
  return data;
}

export function transformTripsToAppFormat(trips) {
  if (!trips || !Array.isArray(trips)) {
    trips = [];
  }

  const stats = {
    total_earnings: 0,
    total_tips: 0,
    total_distance: 0,
    total_trips: trips.length,
    total_days: 0
  };

  const dayMap = new Map();

  trips.forEach(trip => {
    try {
      stats.total_earnings += parseFloat(trip.net_earnings || 0);
      stats.total_tips += parseFloat(trip.tips || 0);
      stats.total_distance += parseFloat(trip.distance || 0);

      const date = trip.timestamp_start.split('T')[0];

    if (!dayMap.has(date)) {
      dayMap.set(date, { date, trips: [] });
    }

    const startDate = new Date(trip.timestamp_start);
    const endDate = new Date(trip.timestamp_end);

    const durationMs = endDate - startDate;
    const durationMin = Math.round(durationMs / 60000);

    const formatTime = (d) => {
      let hours = d.getHours();
      const minutes = d.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
    };

    dayMap.get(date).trips.push({
      restaurant: trip.restaurant || 'Unknown',
      pickup_address: trip.pickup_address || '',
      dropoff_address: trip.dropoff_address || '',
      request_time: formatTime(startDate),
      dropoff_time: formatTime(endDate),
      duration: `${durationMin} min`,
      distance: parseFloat(trip.distance || 0),
      service_type: trip.service_type || '',
      product_type: trip.product_type || '',
      trip_uuid: trip.external_trip_id || trip.trip_id || '',
      pickup_coords: trip.pickup_lng && trip.pickup_lat ? [parseFloat(trip.pickup_lng), parseFloat(trip.pickup_lat)] : null,
      dropoff_coords: trip.dropoff_lng && trip.dropoff_lat ? [parseFloat(trip.dropoff_lng), parseFloat(trip.dropoff_lat)] : null,
      total_pay: parseFloat(trip.net_earnings || 0),
      base_fare: parseFloat(trip.base_fare || 0),
      tip: parseFloat(trip.tips || 0),
      incentive: parseFloat(trip.bonuses || 0),
      quest: 0,
      order_refund: parseFloat(trip.fees || 0)
    });
    } catch (err) {
      console.error('Error processing trip:', trip, err);
    }
  });

  stats.total_days = dayMap.size;

  return {
    generated: new Date().toISOString(),
    stats,
    days: Array.from(dayMap.values())
  };
}
