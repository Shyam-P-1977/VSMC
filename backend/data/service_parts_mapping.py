"""
Service to suggested parts mapping for mechanic workbench.
Maps catalog service names to relevant recommended spare part SKUs.
"""

SERVICE_TO_PARTS_MAPPING = {
    "Oil Change": ["ENG-001", "ENG-002", "ENG-003"],
    "General Service": ["ENG-001", "ENG-003", "ENG-004", "ACC-002"],
    "Brake Repair": ["BRK-001", "BRK-002", "BRK-003", "BRK-004"],
    "Battery Replacement": ["ELC-001", "ELC-002"],
    "Wheel Alignment & Balancing": ["TYR-003", "TYR-004", "TYR-005"],
    "AC Service": ["ACC-001", "ACC-002", "ACC-003"],
    "Engine Check-up": ["ENG-006", "ENG-005", "ENG-004"],
    "Car Wash & Cleaning": ["CLN-001", "CLN-002", "CLN-003", "CLN-004"]
}


def get_suggested_skus_for_services(service_names):
    """
    Given a list of service names, returns a deduplicated list of suggested SKUs.
    """
    suggested = []
    seen = set()
    for name in service_names:
        skus = SERVICE_TO_PARTS_MAPPING.get(name, [])
        for sku in skus:
            if sku not in seen:
                seen.add(sku)
                suggested.append(sku)
    return suggested
