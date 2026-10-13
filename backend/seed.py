import uuid
from datetime import datetime, date, timedelta
from app import create_app
from extensions import db, hash_password
from models import (
    User, Mechanic, Vehicle, Service, Service_Center, Center_Service,
    Time_Slot, Service_Request, Request_Service_Item, Status_History,
    Spare_Part, Job_Part_Used, Job_Labour, Invoice, Invoice_Line_Item,
    Payment, Customer_Feedback, Notification, Contact_Message
)

def ensure_center_slots(center_id, start_date=None, days_ahead=14):
    if not start_date:
        start_date = date.today()

    time_ranges = [
        ("09:00", "10:00"),
        ("10:00", "11:00"),
        ("11:00", "12:00"),
        ("12:00", "13:00"),
        ("14:00", "15:00"),
        ("15:00", "16:00"),
        ("16:00", "17:00"),
        ("17:00", "18:00")
    ]

    for d_offset in range(days_ahead):
        curr_date = (start_date + timedelta(days=d_offset)).isoformat()
        for s_time, e_time in time_ranges:
            slot = Time_Slot.query.filter_by(center_id=center_id, Date=curr_date, Start_Time=s_time).first()
            if not slot:
                slot = Time_Slot(
                    center_id=center_id,
                    Date=curr_date,
                    Start_Time=s_time,
                    End_Time=e_time,
                    Capacity=3,
                    Booked_Count=0
                )
                db.session.add(slot)

def seed_all():
    app = create_app()
    with app.app_context():
        print("[*] Starting VSCMS Multi-Center database seeding...")

        # 0. Global Catalog of 11 Services
        catalog_services_data = [
            ("General Service", "Comprehensive multi-point vehicle inspection, engine oil check, fluid top-up, and air filter cleaning.", 1999.0, 2.5),
            ("Oil Change", "Engine oil flush and premium synthetic engine oil replacement with OEM oil filter.", 899.0, 1.0),
            ("Brake Repair", "Front and rear brake pad inspection, disc caliper cleaning, and hydraulic fluid check.", 1299.0, 1.5),
            ("Engine Check-up", "Electronic OBD-II diagnostic scanning, spark plug testing, and powertrain performance analysis.", 1499.0, 2.0),
            ("Battery Replacement", "Battery health testing, terminal anti-corrosion treatment, and battery replacement service.", 499.0, 0.5),
            ("Wheel Alignment & Balancing", "Computerized 3D 4-wheel alignment and high-speed precision wheel balancing.", 799.0, 1.0),
            ("AC Service", "Cabin HVAC cooling coil cleaning, AC gas refrigerant recharge, and cabin disinfection.", 1799.0, 2.0),
            ("Car Wash & Cleaning", "High-pressure foam exterior wash, underbody rinse, and interior vacuum detailing.", 599.0, 1.0),
            ("Emergency Breakdown Assistance", "On-road emergency diagnostic dispatch, battery jump-start, and roadside towing support.", 2499.0, 1.5),
            ("Emergency Fuel Delivery", "On-spot delivery of up to 5 liters of verified emergency fuel directly to vehicle location.", 699.0, 0.5),
            ("Pick-up & Drop Service", "Convenient door-to-door vehicle valet pick-up and drop by verified workshop personnel.", 399.0, 1.0)
        ]
        created_catalog = {}
        for name, desc, price, hrs in catalog_services_data:
            svc = Service.query.filter_by(Name=name).first()
            if not svc:
                svc = Service(Name=name, Description=desc, Base_Price=price, Estimated_Hours=hrs, Is_Active=True)
                db.session.add(svc)
                db.session.flush()
            created_catalog[name] = svc

        # 1. Platform Admin
        platform_admin = User.query.filter_by(Email='platform@vscms.com').first()
        if not platform_admin:
            platform_admin = User(
                Name="Platform Supervisor",
                Email="platform@vscms.com",
                Contact="9999900001",
                Password_Hash=hash_password("Platform@123"),
                Role="platform_admin",
                Address="VSCMS Headquarters, Maharashtra",
                Is_Active=True
            )
            db.session.add(platform_admin)
            print("  + Created Platform Admin: platform@vscms.com")

        # 2. Seed 8 Service Centers with Owners & Mechanics
        centers_data = [
            {
                "id": 1,
                "name": "VSCMS Central Workshop Pune",
                "email": "center1@vscms.com",
                "phone": "+91 98222 00000",
                "address": "Plot 42, Auto Hub Way, Tech Industrial Park",
                "city": "Pune",
                "area": "Hinjawadi",
                "state": "Maharashtra",
                "pincode": "411057",
                "latitude": 18.5913,
                "longitude": 73.7389,
                "working_hours": "09:00-18:00",
                "working_days": "Mon-Sat",
                "description": "Central flagship workshop with 9 automated hydraulic service bays and diagnostic OBD scanners.",
                "approval_status": "Approved",
                "is_active": True,
                "avg_rating": 4.9,
                "mechanics": [
                    ("mech1@vscms.com", "Ramesh Shinde", "9881100001", "Engine & Powertrain Specialist", 6, 4.9),
                    ("mech2@vscms.com", "Sunil Kadam", "9881100002", "Electrical, Battery & AC Specialist", 4, 4.8),
                    ("vikram@vscms.com", "Vikram Jadhav", "9881100099", "Diagnostics & Transmission Specialist", 7, 4.9)
                ]
            },
            {
                "id": 2,
                "name": "SpeedTech Auto Hub Kothrud",
                "email": "center2@vscms.com",
                "phone": "+91 98222 00002",
                "address": "Shop 14-16, Paud Road, Near Vanaz Metro",
                "city": "Pune",
                "area": "Kothrud",
                "state": "Maharashtra",
                "pincode": "411038",
                "latitude": 18.5074,
                "longitude": 73.8077,
                "working_hours": "09:00-18:00",
                "working_days": "Mon-Sat",
                "description": "Precision performance tuning, express periodic maintenance, and computerized 3D wheel alignment.",
                "approval_status": "Approved",
                "is_active": True,
                "avg_rating": 4.8,
                "mechanics": [
                    ("mech3@vscms.com", "Vikas More", "9881100003", "Brakes, Tyres & Suspension Specialist", 5, 4.7),
                    ("mech4@vscms.com", "Sachin Jadhav", "9881100004", "General Periodic Maintenance", 3, 4.8)
                ]
            },
            {
                "id": 3,
                "name": "Apex Precision Motors Mumbai",
                "email": "center3@vscms.com",
                "phone": "+91 98222 00003",
                "address": "Unit 5, Marol Industrial Area, Andheri-Kurla Road",
                "city": "Mumbai",
                "area": "Andheri East",
                "state": "Maharashtra",
                "pincode": "400069",
                "latitude": 19.1136,
                "longitude": 72.8697,
                "working_hours": "09:00-18:00",
                "working_days": "Mon-Sat",
                "description": "High-throughput Mumbai facility specializing in modern luxury sedans and electric vehicles.",
                "approval_status": "Approved",
                "is_active": True,
                "avg_rating": 4.9,
                "mechanics": [
                    ("mech5@vscms.com", "Kiran Bhosle", "9881100005", "Powertrain & Transmission Overhaul", 7, 4.9),
                    ("mech6@vscms.com", "Tushar Sawant", "9881100006", "AC & Climate Control Specialist", 4, 4.7)
                ]
            },
            {
                "id": 4,
                "name": "Bandra Coastal AutoCare",
                "email": "center4@vscms.com",
                "phone": "+91 98222 00004",
                "address": "12 Hill Road, Near Mehboob Studio",
                "city": "Mumbai",
                "area": "Bandra West",
                "state": "Maharashtra",
                "pincode": "400050",
                "latitude": 19.0596,
                "longitude": 72.8295,
                "working_hours": "09:00-18:00",
                "working_days": "Mon-Sat",
                "description": "Premium detailing, rust-protection coating, and express maintenance in the heart of Bandra.",
                "approval_status": "Approved",
                "is_active": True,
                "avg_rating": 4.7,
                "mechanics": [
                    ("mech7@vscms.com", "Arun Gaikwad", "9881100007", "Ceramic Coating & Body Detailing", 5, 4.8),
                    ("mech8@vscms.com", "Deepak Naik", "9881100008", "Suspension & Brake Overhaul", 4, 4.6)
                ]
            },
            {
                "id": 5,
                "name": "Nashik Valley Motor Works",
                "email": "center5@vscms.com",
                "phone": "+91 98222 00005",
                "address": "Plot 8, Canada Corner, College Road",
                "city": "Nashik",
                "area": "College Road",
                "state": "Maharashtra",
                "pincode": "422005",
                "latitude": 20.0076,
                "longitude": 73.7649,
                "working_hours": "09:00-18:00",
                "working_days": "Mon-Sat",
                "description": "Trusted family auto care facility with certified mechanics and genuine spare parts.",
                "approval_status": "Approved",
                "is_active": True,
                "avg_rating": 4.8,
                "mechanics": [
                    ("mech9@vscms.com", "Nitin Kale", "9881100009", "Engine Diagnostics & ECU Tuning", 6, 4.9),
                    ("mech10@vscms.com", "Anil Deshmukh", "9881100010", "Electrical & Wiring Diagnostics", 5, 4.8)
                ]
            },
            {
                "id": 6,
                "name": "Sinnar Industrial Auto Garage",
                "email": "center6@vscms.com",
                "phone": "+91 98222 00006",
                "address": "Gate No 45, Musalgaon MIDC, Pune-Nashik Highway",
                "city": "Sinnar",
                "area": "Musalgaon MIDC",
                "state": "Maharashtra",
                "pincode": "422112",
                "latitude": 19.8652,
                "longitude": 73.9850,
                "working_hours": "09:00-18:00",
                "working_days": "Mon-Sat",
                "description": "Highway emergency assistance, commercial vehicle care, and heavy diesel fleet maintenance.",
                "approval_status": "Approved",
                "is_active": True,
                "avg_rating": 4.6,
                "mechanics": [
                    ("mech11@vscms.com", "Pravin Patil", "9881100011", "Diesel Injection & Turbochargers", 8, 4.7),
                    ("mech12@vscms.com", "Santosh Shinde", "9881100012", "Chassis & Brake Hydraulics", 4, 4.5)
                ]
            },
            {
                "id": 7,
                "name": "Orange City Express Car Care",
                "email": "center7@vscms.com",
                "phone": "+91 98222 00007",
                "address": "Opposite Traffic Park, West High Court Road",
                "city": "Nagpur",
                "area": "Dharampeth",
                "state": "Maharashtra",
                "pincode": "440010",
                "latitude": 21.1448,
                "longitude": 79.0620,
                "working_hours": "09:00-18:00",
                "working_days": "Mon-Sat",
                "description": "Full-service multi-brand diagnostic center serving Central India with high-precision tools.",
                "approval_status": "Approved",
                "is_active": True,
                "avg_rating": 4.9,
                "mechanics": [
                    ("mech13@vscms.com", "Ganesh Raut", "9881100013", "Advanced OBD-II & Hybrid Systems", 7, 4.9),
                    ("mech14@vscms.com", "Vijay Bawankule", "9881100014", "Steering & Automatic Gearbox", 5, 4.8)
                ]
            },
            {
                "id": 8,
                "name": "Thane Royal Auto Station",
                "email": "center8@vscms.com",
                "phone": "+91 98222 00008",
                "address": "Manpada Junction, Ghodbunder Road",
                "city": "Thane",
                "area": "Ghodbunder Road",
                "state": "Maharashtra",
                "pincode": "400615",
                "latitude": 19.2618,
                "longitude": 72.9644,
                "working_hours": "09:00-18:00",
                "working_days": "Mon-Sat",
                "description": "Rapid turnaround periodic service hub for commuters along Ghodbunder Road and Western Express Highway.",
                "approval_status": "Approved",
                "is_active": True,
                "avg_rating": 4.8,
                "mechanics": [
                    ("mech15@vscms.com", "Mahesh Chavan", "9881100015", "Engine & Powertrain Expert", 5, 4.8),
                    ("mech16@vscms.com", "Roshan Salunkhe", "9881100016", "AC & Heating Systems", 4, 4.7)
                ]
            }
        ]

        # Common spare parts templates
        common_parts_templates = [
            ("Synthetic Engine Oil 5W-40 (4L)", 1850.0, 25, 5),
            ("OEM Oil Filter Element", 320.0, 40, 10),
            ("Engine Air Filter", 480.0, 30, 8),
            ("Front Disc Brake Pads Set", 1450.0, 18, 5),
            ("Rear Brake Shoes / Pads", 1150.0, 15, 4),
            ("Automotive 12V 45Ah Battery", 4600.0, 8, 3),
            ("Cabin AC Micro-Filter", 550.0, 20, 5),
            ("Coolant Premix (3L)", 650.0, 22, 6),
            ("Spark Plug Platinum (Set of 4)", 980.0, 14, 4),
            ("Wiper Blade Pair Hybrid", 750.0, 30, 6),
            ("Brake Fluid DOT 4 (500ml)", 280.0, 25, 5)
        ]

        created_centers = []
        for cdata in centers_data:
            center = db.session.get(Service_Center, cdata["id"])
            if not center:
                center = Service_Center(
                    id=cdata["id"],
                    name=cdata["name"],
                    email=cdata["email"],
                    phone=cdata["phone"],
                    address=cdata["address"],
                    city=cdata["city"],
                    area=cdata["area"],
                    state=cdata["state"],
                    pincode=cdata["pincode"],
                    latitude=cdata["latitude"],
                    longitude=cdata["longitude"],
                    working_hours=cdata["working_hours"],
                    working_days=cdata["working_days"],
                    description=cdata["description"],
                    approval_status=cdata["approval_status"],
                    is_active=cdata["is_active"],
                    avg_rating=cdata["avg_rating"]
                )
                db.session.add(center)
                db.session.flush()

            # Ensure Owner user exists
            owner_user = User.query.filter_by(Email=cdata["email"]).first()
            if not owner_user:
                owner_user = User(
                    Name=f"Manager - {cdata['name']}",
                    Email=cdata["email"],
                    Contact=f"98777000{cdata['id']:02d}",
                    Password_Hash=hash_password("Center@123"),
                    Role="center",
                    Address=cdata["address"],
                    center_id=center.id,
                    city=cdata["city"],
                    area=cdata["area"],
                    state=cdata["state"],
                    latitude=cdata["latitude"],
                    longitude=cdata["longitude"],
                    Is_Active=True
                )
                db.session.add(owner_user)
                db.session.flush()
                center.owner_user_id = owner_user.User_ID
            else:
                owner_user.center_id = center.id
                center.owner_user_id = owner_user.User_ID

            # Link center services with custom prices
            price_multiplier = 0.95 + (cdata["id"] % 3) * 0.05
            for svc_name, svc_obj in created_catalog.items():
                cs = Center_Service.query.filter_by(center_id=center.id, service_id=svc_obj.Service_ID).first()
                if not cs:
                    cs_price = round(svc_obj.Base_Price * price_multiplier, -1)  # Round to nearest 10
                    cs = Center_Service(
                        center_id=center.id,
                        service_id=svc_obj.Service_ID,
                        price=cs_price,
                        estimated_hours=svc_obj.Estimated_Hours,
                        is_active=True
                    )
                    db.session.add(cs)

            # Ensure Center Mechanics exist
            for mech_email, mech_name, mech_phone, spec, exp, m_rating in cdata["mechanics"]:
                m_user = User.query.filter_by(Email=mech_email).first()
                if not m_user:
                    m_user = User(
                        Name=mech_name,
                        Email=mech_email,
                        Contact=mech_phone,
                        Password_Hash=hash_password("Mech@123"),
                        Role="mechanic",
                        Address=f"Staff Bay, {cdata['name']}",
                        center_id=center.id,
                        Is_Active=True
                    )
                    db.session.add(m_user)
                    db.session.flush()

                    mech = Mechanic(
                        User_ID=m_user.User_ID,
                        center_id=center.id,
                        Specialization=spec,
                        experience_years=exp,
                        rating=m_rating,
                        Is_Available=True
                    )
                    db.session.add(mech)
                else:
                    m_user.center_id = center.id
                    if m_user.mechanic_profile:
                        m_user.mechanic_profile.center_id = center.id
                        m_user.mechanic_profile.experience_years = exp
                        m_user.mechanic_profile.rating = m_rating

            # Ensure inventory parts for center
            for pname, pprice, pqty, pthresh in common_parts_templates:
                part = Spare_Part.query.filter_by(center_id=center.id, Name=pname).first()
                if not part:
                    part = Spare_Part(
                        center_id=center.id,
                        Name=pname,
                        Price=pprice,
                        Quantity_In_Stock=pqty,
                        Min_Threshold=pthresh
                    )
                    db.session.add(part)

            # Ensure slots for the center for 14 days
            ensure_center_slots(center.id, days_ahead=14)
            created_centers.append(center)
            print(f"  + Seeded Service Center #{center.id}: {center.name} ({center.city})")

        # 3. Simulate one center having a full slot for tomorrow to demo alternate suggestions
        tomorrow_str = (date.today() + timedelta(days=1)).isoformat()
        full_slot = Time_Slot.query.filter_by(center_id=2, Date=tomorrow_str, Start_Time="10:00").first()
        if full_slot:
            full_slot.Capacity = 3
            full_slot.Booked_Count = 3  # Marked as FULL
            print(f"  + Configured full slot at Center 2 on {tomorrow_str} 10:00-11:00 for unavailable demo")

        # 4. Customers & Vehicles
        customers_data = [
            ("cust1@vscms.com", "Aarav Sharma", "9822200001", "Koregaon Park, Pune", "Pune", "Koregaon Park", 18.5362, 73.8940),
            ("cust2@vscms.com", "Priya Patil", "9822200002", "Hinjawadi Phase 1, Pune", "Pune", "Hinjawadi", 18.5913, 73.7389),
            ("cust3@vscms.com", "Vikram Malhotra", "9822200003", "Andheri East, Mumbai", "Mumbai", "Andheri East", 19.1136, 72.8697),
            ("rahul@example.com", "Rahul Verma", "9822200099", "Hinjawadi Phase 1, Pune", "Pune", "Hinjawadi", 18.5913, 73.7389)
        ]
        created_customers = []
        for email, name, phone, addr, city, area, lat, lng in customers_data:
            user = User.query.filter_by(Email=email).first()
            if not user:
                user = User(
                    Name=name,
                    Email=email,
                    Contact=phone,
                    Password_Hash=hash_password("Customer@123" if email == "rahul@example.com" else "Cust@123"),
                    Role="customer",
                    Address=addr,
                    city=city,
                    area=area,
                    state="Maharashtra",
                    latitude=lat,
                    longitude=lng,
                    Is_Active=True
                )
                db.session.add(user)
                db.session.flush()
            else:
                user.city = city
                user.area = area
                user.latitude = lat
                user.longitude = lng
            created_customers.append(user)

        # Vehicles
        vehicles_data = [
            (created_customers[0].User_ID, "MH12AB1234", "Hyundai", "Creta SX", 2022, "Petrol", "Phantom Black"),
            (created_customers[0].User_ID, "MH12CD5678", "Honda", "City ZX", 2021, "Petrol", "Platinum White"),
            (created_customers[1].User_ID, "DL01EF9012", "Tata", "Nexon EV Max", 2023, "Electric", "Daytona Grey"),
            (created_customers[2].User_ID, "MH02GH3456", "Mahindra", "XUV700 AX7", 2022, "Diesel", "Midnight Black"),
            (created_customers[3].User_ID, "MH12RV9999", "Honda", "City ZX", 2022, "Petrol", "Modern Steel")
        ]
        created_vehicles = []
        for cid, reg, make, model, year, fuel, color in vehicles_data:
            veh = Vehicle.query.filter_by(Registration_Number=reg).first()
            if not veh:
                veh = Vehicle(Customer_ID=cid, Registration_Number=reg, Make=make, Model=model, Year=year, Fuel_Type=fuel, Color=color)
                db.session.add(veh)
                db.session.flush()
            created_vehicles.append(veh)

        # 5. Seed requests across varied statuses
        # Request 1: Pending Approval (New customer booking journey step)
        req_pending = Service_Request.query.filter_by(Problem_Description="Loud squeaking noise from front right wheel when braking at slow speeds.").first()
        today_str = date.today().isoformat()
        slot_p = Time_Slot.query.filter_by(center_id=1, Date=today_str, Start_Time="11:00").first()
        if not req_pending and slot_p:
            req_pending = Service_Request(
                Customer_ID=created_customers[0].User_ID,
                Vehicle_ID=created_vehicles[0].Vehicle_ID,
                Slot_ID=slot_p.Slot_ID,
                center_id=1,
                Status="Pending Approval",
                Problem_Description="Loud squeaking noise from front right wheel when braking at slow speeds.",
                Problem_Categories=["Brakes", "Tyres / wheel vibration"],
                Problem_Symptoms=["Squeaking / grinding noise", "Soft or spongy brake pedal"],
                Problem_Started="A few days ago",
                Problem_Frequency="Every time I drive",
                Urgency="Soon"
            )
            db.session.add(req_pending)
            db.session.flush()
            # Service item
            svc_item = Request_Service_Item(Request_ID=req_pending.Request_ID, Service_ID=created_catalog["Brake Repair"].Service_ID, Unit_Price_At_Time=1299.0)
            db.session.add(svc_item)
            # Status History
            db.session.add(Status_History(Request_ID=req_pending.Request_ID, Status="Pending Approval", Changed_By=created_customers[0].User_ID, Note="Customer appointment requested."))

        # Request 2: Rejected (with reason to demonstrate rebook & choose other center flow)
        req_rejected = Service_Request.query.filter_by(Problem_Description="AC blowing hot air and strange whistling sound from vents.").first()
        slot_r = Time_Slot.query.filter_by(center_id=2, Date=today_str, Start_Time="14:00").first()
        if not req_rejected and slot_r:
            req_rejected = Service_Request(
                Customer_ID=created_customers[1].User_ID,
                Vehicle_ID=created_vehicles[2].Vehicle_ID,
                Slot_ID=slot_r.Slot_ID,
                center_id=2,
                Status="Rejected",
                rejection_reason="Bay fully occupied during 14:00-15:00 window due to urgent transmission repair. Please choose an alternate morning slot or nearby center.",
                rejected_at=datetime.utcnow() - timedelta(hours=2),
                Problem_Description="AC blowing hot air and strange whistling sound from vents.",
                Problem_Categories=["AC not cooling"],
                Problem_Symptoms=["Warm air from vents", "Unusual whistling sound"],
                Problem_Started="Yesterday",
                Problem_Frequency="Continuous",
                Urgency="Routine"
            )
            db.session.add(req_rejected)
            db.session.flush()
            svc_item = Request_Service_Item(Request_ID=req_rejected.Request_ID, Service_ID=created_catalog["AC Service"].Service_ID, Unit_Price_At_Time=1799.0)
            db.session.add(svc_item)
            db.session.add(Status_History(Request_ID=req_rejected.Request_ID, Status="Pending Approval", Note="Appointment booked."))
            db.session.add(Status_History(Request_ID=req_rejected.Request_ID, Status="Rejected", Note=req_rejected.rejection_reason))

        # Request 3: Accepted & Assigned (Shows mechanic card to customer)
        slot_a = Time_Slot.query.filter_by(center_id=1, Date=today_str, Start_Time="09:00").first()
        req_assigned = Service_Request.query.filter_by(Problem_Description="Regular periodic inspection and synthetic engine oil replacement.").first()
        mech_shinde = Mechanic.query.filter_by(Specialization="Engine & Powertrain Specialist").first()
        if not req_assigned and slot_a and mech_shinde:
            req_assigned = Service_Request(
                Customer_ID=created_customers[0].User_ID,
                Vehicle_ID=created_vehicles[1].Vehicle_ID,
                Slot_ID=slot_a.Slot_ID,
                center_id=1,
                Mechanic_ID=mech_shinde.Mechanic_ID,
                Status="Assigned",
                accepted_at=datetime.utcnow() - timedelta(hours=3),
                assigned_at=datetime.utcnow() - timedelta(hours=2),
                Problem_Description="Regular periodic inspection and synthetic engine oil replacement.",
                Problem_Categories=["Routine service"],
                Problem_Symptoms=["Scheduled 20,000 km maintenance due"],
                Problem_Started="Past week",
                Problem_Frequency="Routine scheduled",
                Urgency="Routine"
            )
            db.session.add(req_assigned)
            db.session.flush()
            svc_item = Request_Service_Item(Request_ID=req_assigned.Request_ID, Service_ID=created_catalog["General Service"].Service_ID, Unit_Price_At_Time=1999.0)
            db.session.add(svc_item)
            db.session.add(Status_History(Request_ID=req_assigned.Request_ID, Status="Pending Approval", Note="Appointment requested."))
            db.session.add(Status_History(Request_ID=req_assigned.Request_ID, Status="Accepted", Note="Appointment confirmed by center manager."))
            db.session.add(Status_History(Request_ID=req_assigned.Request_ID, Status="Assigned", Note=f"Technician {mech_shinde.user.Name} assigned to inspect vehicle."))

        # Request 4: Completed with Paid Invoice & Full Line Items (Receipt Demo)
        slot_c = Time_Slot.query.filter_by(center_id=1, Date=today_str, Start_Time="16:00").first()
        req_paid = Service_Request.query.filter_by(Problem_Description="Severe steering wheel vibration at highway speeds above 80 km/h.").first()
        if not req_paid and slot_c and mech_shinde:
            req_paid = Service_Request(
                Customer_ID=created_customers[0].User_ID,
                Vehicle_ID=created_vehicles[0].Vehicle_ID,
                Slot_ID=slot_c.Slot_ID,
                center_id=1,
                Mechanic_ID=mech_shinde.Mechanic_ID,
                Status="Completed",
                accepted_at=datetime.utcnow() - timedelta(days=2, hours=4),
                assigned_at=datetime.utcnow() - timedelta(days=2, hours=3),
                Completed_At=datetime.utcnow() - timedelta(days=2),
                Problem_Description="Severe steering wheel vibration at highway speeds above 80 km/h.",
                Problem_Categories=["Steering / suspension", "Tyres / wheel vibration"],
                Problem_Symptoms=["Vibration at high speeds", "Vehicle pulls to left slightly"],
                Urgency="Routine"
            )
            db.session.add(req_paid)
            db.session.flush()

            # Services
            svc_align = Request_Service_Item(Request_ID=req_paid.Request_ID, Service_ID=created_catalog["Wheel Alignment & Balancing"].Service_ID, Unit_Price_At_Time=799.0)
            db.session.add(svc_align)

            # Parts used
            part_pads = Spare_Part.query.filter_by(center_id=1, Name="Front Disc Brake Pads Set").first()
            if part_pads:
                db.session.add(Job_Part_Used(Request_ID=req_paid.Request_ID, Part_ID=part_pads.Part_ID, Quantity=1, Unit_Price_At_Time=1450.0))

            # Labour
            db.session.add(Job_Labour(
                Request_ID=req_paid.Request_ID,
                Description="3D 4-Wheel Computerized Alignment & Dynamic Caliper Balancing",
                Hours=1.5,
                Rate_Per_Hour=400.0,
                Repair_Notes="Corrected front toe angle (+0.12 deg) and calibrated steering sensor. Replaced worn brake pads and test drove 5 km. High speed wobble eliminated."
            ))

            # Invoice
            existing_inv_count = Invoice.query.count()
            inv_code = f"INV-MC-2026-{(existing_inv_count + 1):04d}"
            while Invoice.query.filter_by(Invoice_Number=inv_code).first():
                existing_inv_count += 1
                inv_code = f"INV-MC-2026-{(existing_inv_count + 1):04d}"

            inv = Invoice(
                center_id=1,
                Request_ID=req_paid.Request_ID,
                Invoice_Number=inv_code,
                Labour_Charge=600.0,
                Parts_Cost=1450.0,
                GST_Rate=18.0,
                GST_Amount=512.82,
                Discount=150.0,
                Total_Amount=3211.82,
                Status="Paid",
                Created_At=datetime.utcnow() - timedelta(days=2)
            )
            db.session.add(inv)
            db.session.flush()

            # Invoice Line Items
            db.session.add(Invoice_Line_Item(invoice_id=inv.Invoice_ID, item_type="Service", description="Wheel Alignment & Balancing (4-Wheel)", quantity=1.0, unit_price=799.0, amount=799.0))
            db.session.add(Invoice_Line_Item(invoice_id=inv.Invoice_ID, item_type="Part", description="Front Disc Brake Pads Set (OEM)", quantity=1.0, unit_price=1450.0, amount=1450.0))
            db.session.add(Invoice_Line_Item(invoice_id=inv.Invoice_ID, item_type="Labour", description="Steering & Caliper Realignment (1.5 hrs @ ₹400/hr)", quantity=1.5, unit_price=400.0, amount=600.0))

            # Payment
            txn_code = f"TXN-UPI-{uuid.uuid4().hex[:8].upper()}"
            db.session.add(Payment(
                Invoice_ID=inv.Invoice_ID,
                Amount=3211.82,
                Method="UPI",
                Transaction_ID=txn_code,
                Status="Success",
                Created_At=datetime.utcnow() - timedelta(days=2)
            ))

            # Feedback
            db.session.add(Customer_Feedback(
                request_id=req_paid.Request_ID,
                customer_id=created_customers[0].User_ID,
                center_id=1,
                mechanic_id=mech_shinde.Mechanic_ID,
                rating=5,
                comment="Smooth and super fast service! The alignment wobble is completely gone. Mechanic Shinde explained everything clearly."
            ))

        db.session.commit()
        print("[OK] Multi-center seed data populated successfully!")

if __name__ == '__main__':
    seed_all()
