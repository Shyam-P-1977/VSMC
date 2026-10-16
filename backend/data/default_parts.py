"""
Default Spare Parts Catalog for VSCMS
Contains 44 standard spare parts across 8 automotive categories.
Prices are in INR before GST (indicative wholesale/workshop retail rates).
"""

DEFAULT_SPARE_PARTS = [
    # Engine & Oils (10 items)
    {
        "sku": "ENG-001",
        "name": "Engine Oil 5W-30 Synthetic",
        "category": "Engine & Oils",
        "unit": "litre",
        "price": 650.0,
        "initial_qty": 60,
        "min_threshold": 15
    },
    {
        "sku": "ENG-002",
        "name": "Engine Oil 10W-40 Semi-Synthetic",
        "category": "Engine & Oils",
        "unit": "litre",
        "price": 480.0,
        "initial_qty": 60,
        "min_threshold": 15
    },
    {
        "sku": "ENG-003",
        "name": "Oil Filter",
        "category": "Engine & Oils",
        "unit": "piece",
        "price": 250.0,
        "initial_qty": 40,
        "min_threshold": 10
    },
    {
        "sku": "ENG-004",
        "name": "Air Filter",
        "category": "Engine & Oils",
        "unit": "piece",
        "price": 380.0,
        "initial_qty": 30,
        "min_threshold": 8
    },
    {
        "sku": "ENG-005",
        "name": "Fuel Filter",
        "category": "Engine & Oils",
        "unit": "piece",
        "price": 450.0,
        "initial_qty": 20,
        "min_threshold": 6
    },
    {
        "sku": "ENG-006",
        "name": "Spark Plug Set (4 pcs)",
        "category": "Engine & Oils",
        "unit": "set",
        "price": 900.0,
        "initial_qty": 20,
        "min_threshold": 5
    },
    {
        "sku": "ENG-007",
        "name": "Drive (Serpentine) Belt",
        "category": "Engine & Oils",
        "unit": "piece",
        "price": 850.0,
        "initial_qty": 15,
        "min_threshold": 4
    },
    {
        "sku": "ENG-008",
        "name": "Timing Belt Kit",
        "category": "Engine & Oils",
        "unit": "kit",
        "price": 3800.0,
        "initial_qty": 8,
        "min_threshold": 3
    },
    {
        "sku": "ENG-009",
        "name": "Engine Coolant 50:50 Premix",
        "category": "Engine & Oils",
        "unit": "litre",
        "price": 320.0,
        "initial_qty": 40,
        "min_threshold": 10
    },
    {
        "sku": "ENG-010",
        "name": "Radiator Cap",
        "category": "Engine & Oils",
        "unit": "piece",
        "price": 220.0,
        "initial_qty": 4,  # Starts LOW (4 < 6)
        "min_threshold": 6
    },

    # Brakes (5 items)
    {
        "sku": "BRK-001",
        "name": "Front Brake Pad Set",
        "category": "Brakes",
        "unit": "set",
        "price": 1800.0,
        "initial_qty": 20,
        "min_threshold": 5
    },
    {
        "sku": "BRK-002",
        "name": "Rear Brake Shoe / Pad Set",
        "category": "Brakes",
        "unit": "set",
        "price": 1400.0,
        "initial_qty": 16,
        "min_threshold": 5
    },
    {
        "sku": "BRK-003",
        "name": "Front Brake Disc (pair)",
        "category": "Brakes",
        "unit": "pair",
        "price": 3200.0,
        "initial_qty": 8,
        "min_threshold": 3
    },
    {
        "sku": "BRK-004",
        "name": "Brake Fluid DOT 4 (500 ml)",
        "category": "Brakes",
        "unit": "bottle",
        "price": 280.0,
        "initial_qty": 30,
        "min_threshold": 8
    },
    {
        "sku": "BRK-005",
        "name": "Handbrake Cable",
        "category": "Brakes",
        "unit": "piece",
        "price": 650.0,
        "initial_qty": 10,
        "min_threshold": 3
    },

    # Battery & Electrical (7 items)
    {
        "sku": "ELC-001",
        "name": "Car Battery 12V 45Ah",
        "category": "Battery & Electrical",
        "unit": "piece",
        "price": 5200.0,
        "initial_qty": 2,  # Starts LOW (2 < 3)
        "min_threshold": 3
    },
    {
        "sku": "ELC-002",
        "name": "Car Battery 12V 65Ah",
        "category": "Battery & Electrical",
        "unit": "piece",
        "price": 7400.0,
        "initial_qty": 5,
        "min_threshold": 2
    },
    {
        "sku": "ELC-003",
        "name": "Headlight Bulb H4 (pair)",
        "category": "Battery & Electrical",
        "unit": "pair",
        "price": 420.0,
        "initial_qty": 25,
        "min_threshold": 8
    },
    {
        "sku": "ELC-004",
        "name": "Fuse Assortment Kit",
        "category": "Battery & Electrical",
        "unit": "kit",
        "price": 250.0,
        "initial_qty": 30,
        "min_threshold": 10
    },
    {
        "sku": "ELC-005",
        "name": "Wiper Blade (pair)",
        "category": "Battery & Electrical",
        "unit": "pair",
        "price": 550.0,
        "initial_qty": 25,
        "min_threshold": 8
    },
    {
        "sku": "ELC-006",
        "name": "Starter Motor",
        "category": "Battery & Electrical",
        "unit": "piece",
        "price": 6500.0,
        "initial_qty": 3,
        "min_threshold": 2
    },
    {
        "sku": "ELC-007",
        "name": "Alternator",
        "category": "Battery & Electrical",
        "unit": "piece",
        "price": 8200.0,
        "initial_qty": 0,  # Starts OUT OF STOCK (0)
        "min_threshold": 2
    },

    # Tyres & Wheels (6 items)
    {
        "sku": "TYR-001",
        "name": "Tyre 185/65 R15",
        "category": "Tyres & Wheels",
        "unit": "piece",
        "price": 4800.0,
        "initial_qty": 8,
        "min_threshold": 4
    },
    {
        "sku": "TYR-002",
        "name": "Tyre 195/55 R16",
        "category": "Tyres & Wheels",
        "unit": "piece",
        "price": 5600.0,
        "initial_qty": 6,
        "min_threshold": 4
    },
    {
        "sku": "TYR-003",
        "name": "Wheel Balancing Weights (pack)",
        "category": "Tyres & Wheels",
        "unit": "pack",
        "price": 120.0,
        "initial_qty": 80,
        "min_threshold": 20
    },
    {
        "sku": "TYR-004",
        "name": "Tubeless Tyre Valve",
        "category": "Tyres & Wheels",
        "unit": "piece",
        "price": 60.0,
        "initial_qty": 60,
        "min_threshold": 20
    },
    {
        "sku": "TYR-005",
        "name": "Wheel Nut",
        "category": "Tyres & Wheels",
        "unit": "piece",
        "price": 45.0,
        "initial_qty": 100,
        "min_threshold": 30
    },
    {
        "sku": "TYR-006",
        "name": "Puncture Repair Patch Kit",
        "category": "Tyres & Wheels",
        "unit": "kit",
        "price": 180.0,
        "initial_qty": 3,  # Starts LOW (3 < 8)
        "min_threshold": 8
    },

    # Suspension & Steering (6 items)
    {
        "sku": "SUS-001",
        "name": "Front Shock Absorber",
        "category": "Suspension & Steering",
        "unit": "piece",
        "price": 3400.0,
        "initial_qty": 8,
        "min_threshold": 3
    },
    {
        "sku": "SUS-002",
        "name": "Rear Shock Absorber",
        "category": "Suspension & Steering",
        "unit": "piece",
        "price": 2900.0,
        "initial_qty": 8,
        "min_threshold": 3
    },
    {
        "sku": "SUS-003",
        "name": "Stabilizer Link",
        "category": "Suspension & Steering",
        "unit": "piece",
        "price": 650.0,
        "initial_qty": 16,
        "min_threshold": 6
    },
    {
        "sku": "SUS-004",
        "name": "Tie Rod End",
        "category": "Suspension & Steering",
        "unit": "piece",
        "price": 750.0,
        "initial_qty": 16,
        "min_threshold": 6
    },
    {
        "sku": "SUS-005",
        "name": "Ball Joint",
        "category": "Suspension & Steering",
        "unit": "piece",
        "price": 850.0,
        "initial_qty": 12,
        "min_threshold": 4
    },
    {
        "sku": "SUS-006",
        "name": "Power Steering Fluid",
        "category": "Suspension & Steering",
        "unit": "litre",
        "price": 420.0,
        "initial_qty": 20,
        "min_threshold": 6
    },

    # AC & Cooling (3 items)
    {
        "sku": "ACC-001",
        "name": "AC Refrigerant R134a (500 g can)",
        "category": "AC & Cooling",
        "unit": "can",
        "price": 950.0,
        "initial_qty": 12,
        "min_threshold": 4
    },
    {
        "sku": "ACC-002",
        "name": "Cabin Air Filter",
        "category": "AC & Cooling",
        "unit": "piece",
        "price": 450.0,
        "initial_qty": 25,
        "min_threshold": 8
    },
    {
        "sku": "ACC-003",
        "name": "AC Compressor Oil",
        "category": "AC & Cooling",
        "unit": "bottle",
        "price": 380.0,
        "initial_qty": 10,
        "min_threshold": 3
    },

    # Transmission (3 items)
    {
        "sku": "TRN-001",
        "name": "Gear Oil 75W-90",
        "category": "Transmission",
        "unit": "litre",
        "price": 720.0,
        "initial_qty": 20,
        "min_threshold": 6
    },
    {
        "sku": "TRN-002",
        "name": "ATF (Automatic Transmission Fluid)",
        "category": "Transmission",
        "unit": "litre",
        "price": 690.0,
        "initial_qty": 20,
        "min_threshold": 6
    },
    {
        "sku": "TRN-003",
        "name": "Clutch Plate Kit",
        "category": "Transmission",
        "unit": "kit",
        "price": 5500.0,
        "initial_qty": 5,
        "min_threshold": 2
    },

    # Detailing & Consumables (4 items)
    {
        "sku": "CLN-001",
        "name": "Car Shampoo",
        "category": "Detailing & Consumables",
        "unit": "litre",
        "price": 260.0,
        "initial_qty": 20,
        "min_threshold": 5
    },
    {
        "sku": "CLN-002",
        "name": "Wax Polish (500 ml)",
        "category": "Detailing & Consumables",
        "unit": "bottle",
        "price": 480.0,
        "initial_qty": 12,
        "min_threshold": 4
    },
    {
        "sku": "CLN-003",
        "name": "Microfiber Cloth (pack of 5)",
        "category": "Detailing & Consumables",
        "unit": "pack",
        "price": 180.0,
        "initial_qty": 30,
        "min_threshold": 10
    },
    {
        "sku": "CLN-004",
        "name": "Interior Cleaner / Dashboard Polish",
        "category": "Detailing & Consumables",
        "unit": "bottle",
        "price": 320.0,
        "initial_qty": 15,
        "min_threshold": 5
    }
]

SPARE_PART_CATEGORIES = [
    "Engine & Oils",
    "Brakes",
    "Battery & Electrical",
    "Tyres & Wheels",
    "Suspension & Steering",
    "AC & Cooling",
    "Transmission",
    "Detailing & Consumables"
]


def calculate_stock_status(quantity: int, min_threshold: int):
    """
    Unified stock status helper rule:
    quantity == 0 -> "out" ("Out of stock", red)
    quantity < min_threshold -> "low" ("Low stock", orange)
    otherwise -> "in" ("In stock", green)
    """
    qty = quantity if quantity is not None else 0
    thresh = min_threshold if min_threshold is not None else 0
    if qty <= 0:
        return {
            "status": "out",
            "label": "Out of stock",
            "badge_variant": "danger"
        }
    if qty < thresh:
        return {
            "status": "low",
            "label": "Low stock",
            "badge_variant": "warning"
        }
    return {
        "status": "in",
        "label": "In stock",
        "badge_variant": "success"
    }
