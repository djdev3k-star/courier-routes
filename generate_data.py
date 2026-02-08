"""
Generate JSON data for Courier Routes App
Exports trip data with geocoded coordinates and payment info
"""

import pandas as pd
import os
import re
import json
from datetime import datetime
from collections import defaultdict

# Source data paths
SOURCE_DIR = r"c:\Users\dj-dev\Documents\courier\data"
GEOCODED_FILE = os.path.join(SOURCE_DIR, "geocoded_addresses.csv")
TRIPS_DIR = os.path.join(SOURCE_DIR, "consolidated", "trips")
PAYMENTS_DIR = os.path.join(SOURCE_DIR, "consolidated", "payments")

# Output
OUTPUT_DIR = r"C:\Users\dj-dev\Documents\repositories\courier-routes\data"

def normalize_address(address):
    if pd.isna(address):
        return ""
    addr = re.sub(r'^[^,]+,\s*', '', str(address)) if ',' in str(address) else str(address)
    addr = addr.lower().strip()
    addr = re.sub(r'\s+', ' ', addr)
    return addr

def extract_street_address(full_address):
    if pd.isna(full_address):
        return ""
    addr = str(full_address)
    if '), ' in addr:
        addr = addr.split('), ', 1)[1]
    elif ', ' in addr:
        parts = addr.split(', ')
        if len(parts) > 2 and not any(c.isdigit() for c in parts[0][:3]):
            addr = ', '.join(parts[1:])
    return addr.strip()

def load_geocoded_addresses():
    df = pd.read_csv(GEOCODED_FILE)
    geocode_dict = {}
    for _, row in df.iterrows():
        addr = normalize_address(row['address'])
        geocode_dict[addr] = (row['latitude'], row['longitude'])
    return geocode_dict

def find_coordinates(address, geocode_dict):
    if pd.isna(address):
        return None
    
    normalized = normalize_address(address)
    if normalized in geocode_dict:
        return geocode_dict[normalized]
    
    street_addr = extract_street_address(address)
    normalized_street = normalize_address(street_addr)
    if normalized_street in geocode_dict:
        return geocode_dict[normalized_street]
    
    for geo_addr, coords in geocode_dict.items():
        if normalized_street and normalized_street in geo_addr:
            return coords
        if normalized_street:
            street_parts = normalized_street.split(',')[0] if ',' in normalized_street else normalized_street
            if street_parts and len(street_parts) > 5 and street_parts in geo_addr:
                return coords
    
    return None

def load_all_payments():
    all_payments = []
    
    for filename in os.listdir(PAYMENTS_DIR):
        if filename.endswith('.csv'):
            filepath = os.path.join(PAYMENTS_DIR, filename)
            df = pd.read_csv(filepath)
            all_payments.append(df)
    
    if not all_payments:
        return pd.DataFrame()
    
    combined = pd.concat(all_payments, ignore_index=True)
    # Include completed orders, fare adjustments, and business orders (Connect)
    combined = combined[combined['Description'].str.contains('completed order|fare adjust|business order|business adjustment', case=False, na=False)].copy()
    
    payment_agg = combined.groupby('Trip UUID').agg({
        'Paid to you': 'sum',
        'Paid to you:Your earnings:Fare:Fare': 'sum',
        'Paid to you:Your earnings:Tip': 'sum',
        'Paid to you:Your earnings:Promotion:Incentive': 'sum',
        'Paid to you:Your earnings:Promotion:Quest': 'sum',
        'Paid to you:Trip balance:Refunds:Order Value': 'sum',
    }).reset_index()
    
    payment_agg.columns = ['Trip UUID', 'total_pay', 'base_fare', 'tip', 'incentive', 'quest', 'order_refund']
    return payment_agg

def load_all_trips():
    all_trips = []
    
    for filename in os.listdir(TRIPS_DIR):
        if filename.endswith('.csv'):
            filepath = os.path.join(TRIPS_DIR, filename)
            df = pd.read_csv(filepath)
            all_trips.append(df)
    
    if not all_trips:
        return pd.DataFrame()
    
    combined = pd.concat(all_trips, ignore_index=True)
    combined['Trip request time'] = pd.to_datetime(combined['Trip request time'], errors='coerce')
    combined['Trip drop off time'] = pd.to_datetime(combined['Trip drop off time'], errors='coerce')
    combined['date'] = combined['Trip request time'].dt.date
    combined = combined[combined['Trip status'] == 'completed'].copy()
    
    payments = load_all_payments()
    if not payments.empty:
        combined = combined.merge(payments, on='Trip UUID', how='left')
        for col in ['total_pay', 'base_fare', 'tip', 'incentive', 'quest', 'order_refund']:
            combined[col] = combined[col].fillna(0)
    else:
        for col in ['total_pay', 'base_fare', 'tip', 'incentive', 'quest', 'order_refund']:
            combined[col] = 0
    
    return combined

def extract_restaurant_name(address):
    if pd.isna(address):
        return "Unknown"
    addr = str(address)
    if '(' in addr and ')' in addr:
        name = addr.split('(')[0].strip()
        if name:
            return name
    elif ', ' in addr:
        parts = addr.split(', ')
        if len(parts) > 2 and not any(c.isdigit() for c in parts[0][:3]):
            return parts[0]
    return addr.split(',')[0][:30]

def format_time(dt):
    if pd.isna(dt):
        return "N/A"
    try:
        return dt.strftime("%I:%M %p")
    except:
        return str(dt)

def format_duration(start, end):
    if pd.isna(start) or pd.isna(end):
        return "N/A"
    try:
        duration = end - start
        minutes = int(duration.total_seconds() / 60)
        if minutes < 60:
            return f"{minutes} min"
        else:
            hours = minutes // 60
            mins = minutes % 60
            return f"{hours}h {mins}m"
    except:
        return "N/A"

def main():
    print("Generating data for Courier Routes App...")
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("Loading geocoded addresses...")
    geocode_dict = load_geocoded_addresses()
    print(f"  Loaded {len(geocode_dict)} addresses")
    
    print("Loading trips...")
    trips_df = load_all_trips()
    print(f"  Loaded {len(trips_df)} trips")
    
    # Group by day
    daily_data = {}
    
    for _, trip in trips_df.iterrows():
        if pd.isna(trip['date']):
            continue
        
        date_str = str(trip['date'])
        
        if date_str not in daily_data:
            daily_data[date_str] = {
                'date': date_str,
                'trips': [],
                'stats': {
                    'total_earnings': 0,
                    'total_tips': 0,
                    'total_distance': 0,
                    'trip_count': 0
                }
            }
        
        pickup_addr = trip['Pickup address']
        dropoff_addr = trip['Drop off address']
        pickup_coords = find_coordinates(pickup_addr, geocode_dict)
        dropoff_coords = find_coordinates(dropoff_addr, geocode_dict)
        
        trip_info = {
            'restaurant': extract_restaurant_name(pickup_addr),
            'pickup_address': str(pickup_addr) if pd.notna(pickup_addr) else 'N/A',
            'dropoff_address': str(dropoff_addr) if pd.notna(dropoff_addr) else 'N/A',
            'request_time': format_time(trip['Trip request time']),
            'dropoff_time': format_time(trip['Trip drop off time']),
            'duration': format_duration(trip['Trip request time'], trip['Trip drop off time']),
            'distance': float(trip['Trip distance']) if pd.notna(trip['Trip distance']) else 0,
            'service_type': str(trip['Service type']) if pd.notna(trip['Service type']) else 'N/A',
            'product_type': str(trip['Product Type']) if pd.notna(trip['Product Type']) else 'N/A',
            'trip_uuid': str(trip['Trip UUID']) if pd.notna(trip['Trip UUID']) else 'N/A',
            'pickup_coords': [pickup_coords[1], pickup_coords[0]] if pickup_coords else None,
            'dropoff_coords': [dropoff_coords[1], dropoff_coords[0]] if dropoff_coords else None,
            'total_pay': float(trip['total_pay']) if pd.notna(trip.get('total_pay')) else 0,
            'base_fare': float(trip['base_fare']) if pd.notna(trip.get('base_fare')) else 0,
            'tip': float(trip['tip']) if pd.notna(trip.get('tip')) else 0,
            'incentive': float(trip['incentive']) if pd.notna(trip.get('incentive')) else 0,
            'quest': float(trip['quest']) if pd.notna(trip.get('quest')) else 0,
            'order_refund': float(trip['order_refund']) if pd.notna(trip.get('order_refund')) else 0,
        }
        
        daily_data[date_str]['trips'].append(trip_info)
        daily_data[date_str]['stats']['total_earnings'] += trip_info['total_pay']
        daily_data[date_str]['stats']['total_tips'] += trip_info['tip']
        daily_data[date_str]['stats']['total_distance'] += trip_info['distance']
        daily_data[date_str]['stats']['trip_count'] += 1
    
    # Sort trips within each day by request time
    for date_str in daily_data:
        daily_data[date_str]['trips'].sort(key=lambda x: x['request_time'])
    
    # Calculate overall stats
    overall_stats = {
        'total_earnings': sum(d['stats']['total_earnings'] for d in daily_data.values()),
        'total_tips': sum(d['stats']['total_tips'] for d in daily_data.values()),
        'total_distance': sum(d['stats']['total_distance'] for d in daily_data.values()),
        'total_trips': sum(d['stats']['trip_count'] for d in daily_data.values()),
        'total_days': len(daily_data)
    }
    
    # Create output
    output = {
        'generated': datetime.now().isoformat(),
        'stats': overall_stats,
        'days': list(daily_data.values())
    }
    
    # Sort days by date
    output['days'].sort(key=lambda x: x['date'])
    
    # Write JSON
    output_file = os.path.join(OUTPUT_DIR, 'routes.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
    
    print(f"\nGenerated: {output_file}")
    print(f"  {overall_stats['total_days']} days")
    print(f"  {overall_stats['total_trips']} trips")
    print(f"  ${overall_stats['total_earnings']:,.2f} total earnings")

if __name__ == "__main__":
    main()
