import math

MAHARASHTRA_LOCATIONS = {
    "Pune": {
        "lat": 18.5204,
        "lng": 73.8567,
        "areas": [
            {"name": "Hinjawadi", "lat": 18.5913, "lng": 73.7389, "pincode": "411057"},
            {"name": "Baner", "lat": 18.5590, "lng": 73.7868, "pincode": "411045"},
            {"name": "Kothrud", "lat": 18.5074, "lng": 73.8077, "pincode": "411038"},
            {"name": "Viman Nagar", "lat": 18.5679, "lng": 73.9143, "pincode": "411014"},
            {"name": "Hadapsar", "lat": 18.5089, "lng": 73.9259, "pincode": "411028"},
            {"name": "Wakad", "lat": 18.5987, "lng": 73.7635, "pincode": "411057"},
            {"name": "Shivajinagar", "lat": 18.5314, "lng": 73.8446, "pincode": "411005"},
            {"name": "Aundh", "lat": 18.5602, "lng": 73.8070, "pincode": "411007"}
        ]
    },
    "Mumbai": {
        "lat": 19.0760,
        "lng": 72.8777,
        "areas": [
            {"name": "Bandra West", "lat": 19.0596, "lng": 72.8295, "pincode": "400050"},
            {"name": "Andheri East", "lat": 19.1136, "lng": 72.8697, "pincode": "400069"},
            {"name": "Powai", "lat": 19.1176, "lng": 72.9060, "pincode": "400076"},
            {"name": "Borivali West", "lat": 19.2307, "lng": 72.8567, "pincode": "400092"},
            {"name": "Dadar", "lat": 19.0178, "lng": 72.8478, "pincode": "400014"},
            {"name": "Worli", "lat": 19.0134, "lng": 72.8184, "pincode": "400018"},
            {"name": "Goregaon East", "lat": 19.1663, "lng": 72.8526, "pincode": "400063"}
        ]
    },
    "Nashik": {
        "lat": 19.9975,
        "lng": 73.7898,
        "areas": [
            {"name": "Panchavati", "lat": 20.0110, "lng": 73.7903, "pincode": "422003"},
            {"name": "College Road", "lat": 20.0076, "lng": 73.7649, "pincode": "422005"},
            {"name": "Indira Nagar", "lat": 19.9675, "lng": 73.7845, "pincode": "422009"},
            {"name": "CIDCO", "lat": 19.9723, "lng": 73.7483, "pincode": "422009"},
            {"name": "Satpur MIDC", "lat": 19.9983, "lng": 73.7226, "pincode": "422007"},
            {"name": "Gangapur Road", "lat": 20.0194, "lng": 73.7505, "pincode": "422013"}
        ]
    },
    "Nagpur": {
        "lat": 21.1458,
        "lng": 79.0882,
        "areas": [
            {"name": "Dharampeth", "lat": 21.1448, "lng": 79.0620, "pincode": "440010"},
            {"name": "Sitabuldi", "lat": 21.1466, "lng": 79.0827, "pincode": "440012"},
            {"name": "Sadar", "lat": 21.1610, "lng": 79.0830, "pincode": "440001"},
            {"name": "Wardha Road", "lat": 21.0965, "lng": 79.0655, "pincode": "440015"},
            {"name": "Manewada", "lat": 21.1030, "lng": 79.1020, "pincode": "440024"},
            {"name": "Ramdaspeth", "lat": 21.1350, "lng": 79.0730, "pincode": "440010"}
        ]
    },
    "Sinnar": {
        "lat": 19.8456,
        "lng": 74.0006,
        "areas": [
            {"name": "Sinnar City Center", "lat": 19.8456, "lng": 74.0006, "pincode": "422103"},
            {"name": "Musalgaon MIDC", "lat": 19.8652, "lng": 73.9850, "pincode": "422112"},
            {"name": "Wavi", "lat": 19.8210, "lng": 74.0530, "pincode": "422104"},
            {"name": "Baragaon Pimpri", "lat": 19.8700, "lng": 74.0200, "pincode": "422103"},
            {"name": "Gonde", "lat": 19.8150, "lng": 73.9600, "pincode": "422103"},
            {"name": "Malegaon Shivar", "lat": 19.8510, "lng": 73.9720, "pincode": "422103"}
        ]
    },
    "Thane": {
        "lat": 19.2183,
        "lng": 72.9781,
        "areas": [
            {"name": "Ghodbunder Road", "lat": 19.2618, "lng": 72.9644, "pincode": "400615"},
            {"name": "Majiwada", "lat": 19.2155, "lng": 72.9830, "pincode": "400601"},
            {"name": "Naupada", "lat": 19.1860, "lng": 72.9730, "pincode": "400602"},
            {"name": "Vartak Nagar", "lat": 19.2120, "lng": 72.9600, "pincode": "400606"},
            {"name": "Wagle Estate", "lat": 19.1920, "lng": 72.9510, "pincode": "400604"},
            {"name": "Kolshet Road", "lat": 19.2310, "lng": 72.9860, "pincode": "400607"}
        ]
    },
    "Aurangabad": {
        "lat": 19.8762,
        "lng": 75.3433,
        "areas": [
            {"name": "Cidco Cannaught", "lat": 19.8820, "lng": 75.3580, "pincode": "431003"},
            {"name": "Waluj MIDC", "lat": 19.8320, "lng": 75.2410, "pincode": "431136"},
            {"name": "Garkheda", "lat": 19.8650, "lng": 75.3480, "pincode": "431009"},
            {"name": "Samarth Nagar", "lat": 19.8890, "lng": 75.3250, "pincode": "431001"},
            {"name": "Chikalthana", "lat": 19.8790, "lng": 75.4020, "pincode": "431006"},
            {"name": "Beed Bypass", "lat": 19.8530, "lng": 75.3210, "pincode": "431010"}
        ]
    },
    "Kolhapur": {
        "lat": 16.7050,
        "lng": 74.2433,
        "areas": [
            {"name": "Rajarampuri", "lat": 16.6920, "lng": 74.2410, "pincode": "416008"},
            {"name": "Tarabai Park", "lat": 16.7110, "lng": 74.2320, "pincode": "416003"},
            {"name": "Shahupuri", "lat": 16.7020, "lng": 74.2380, "pincode": "416001"},
            {"name": "Shiroli MIDC", "lat": 16.7530, "lng": 74.2810, "pincode": "416122"},
            {"name": "Nagala Park", "lat": 16.7150, "lng": 74.2250, "pincode": "416003"},
            {"name": "Rankala", "lat": 16.6890, "lng": 74.2120, "pincode": "416012"}
        ]
    }
}

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    """
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
    except (ValueError, TypeError):
        return 9999.0

    R = 6371.0 # Radius of earth in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    distance = R * c
    return round(distance, 2)

def get_all_cities():
    return [
        {"name": city, "state": "Maharashtra", "lat": data["lat"], "lng": data["lng"], "areas_count": len(data["areas"])}
        for city, data in MAHARASHTRA_LOCATIONS.items()
    ]

def get_areas_for_city(city_name):
    if not city_name:
        return []
    city_data = MAHARASHTRA_LOCATIONS.get(city_name.strip())
    if not city_data:
        # Case insensitive match
        for k, v in MAHARASHTRA_LOCATIONS.items():
            if k.lower() == city_name.strip().lower():
                return v["areas"]
        return []
    return city_data["areas"]

def find_nearest_area(lat, lng):
    """Given user GPS, find nearest seeded area"""
    min_dist = float('inf')
    best = None
    for city, data in MAHARASHTRA_LOCATIONS.items():
        for area in data["areas"]:
            dist = haversine_distance(lat, lng, area["lat"], area["lng"])
            if dist < min_dist:
                min_dist = dist
                best = {
                    "city": city,
                    "area": area["name"],
                    "state": "Maharashtra",
                    "lat": area["lat"],
                    "lng": area["lng"],
                    "distance_km": dist
                }
    return best
