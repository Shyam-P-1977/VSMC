from datetime import datetime
from extensions import db

class Service_Center(db.Model):
    __tablename__ = 'service_centers'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    center_code = db.Column(db.String(30), unique=True, nullable=True, index=True)
    owner_user_id = db.Column(db.Integer, db.ForeignKey('users.User_ID', use_alter=True, name='fk_service_center_owner'), nullable=True)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    city = db.Column(db.String(50), nullable=False)
    area = db.Column(db.String(50), nullable=False)
    state = db.Column(db.String(50), default='Maharashtra', nullable=False)
    pincode = db.Column(db.String(10), nullable=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    working_hours = db.Column(db.String(50), default='09:00-18:00', nullable=False)
    working_days = db.Column(db.String(50), default='Mon-Sat', nullable=False)
    description = db.Column(db.Text, nullable=True)
    photo_url = db.Column(db.String(255), nullable=True)
    approval_status = db.Column(db.String(20), default='Pending', nullable=False)  # 'Pending', 'Approved', 'Rejected', 'Suspended'
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    avg_rating = db.Column(db.Float, default=4.8, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    owner = db.relationship('User', foreign_keys=[owner_user_id], back_populates='owned_centers')
    center_services = db.relationship('Center_Service', back_populates='center', cascade='all, delete-orphan')
    mechanics = db.relationship('Mechanic', back_populates='center')
    slots = db.relationship('Time_Slot', back_populates='center', cascade='all, delete-orphan')
    parts = db.relationship('Spare_Part', back_populates='center', cascade='all, delete-orphan')
    requests = db.relationship('Service_Request', back_populates='center')
    feedbacks = db.relationship('Customer_Feedback', back_populates='center', cascade='all, delete-orphan')
    invoices = db.relationship('Invoice', back_populates='center')

    def to_dict(self, include_services=False):
        data = {
            "id": self.id,
            "Center_ID": self.id,
            "name": self.name,
            "center_code": self.center_code,
            "owner_user_id": self.owner_user_id,
            "email": self.email,
            "phone": self.phone,
            "address": self.address,
            "city": self.city,
            "area": self.area,
            "state": self.state,
            "pincode": self.pincode,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "working_hours": self.working_hours,
            "working_days": self.working_days,
            "description": self.description,
            "photo_url": self.photo_url or f"https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80",
            "approval_status": self.approval_status,
            "is_active": self.is_active,
            "avg_rating": round(self.avg_rating, 1) if self.avg_rating else 4.8,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "services_count": len(self.center_services) if self.center_services else 0,
            "mechanics_count": len(self.mechanics) if self.mechanics else 0
        }
        if include_services:
            data["offered_services"] = [cs.to_dict() for cs in self.center_services if cs.is_active]
        return data


class User(db.Model):
    __tablename__ = 'users'

    User_ID = db.Column(db.Integer, primary_key=True)
    Name = db.Column(db.String(120), nullable=False)
    Email = db.Column(db.String(120), unique=True, nullable=False)
    Contact = db.Column(db.String(20), unique=True, nullable=False)
    Password_Hash = db.Column(db.String(255), nullable=False)
    Role = db.Column(db.String(30), nullable=False)  # 'customer', 'center' (or legacy 'admin'), 'mechanic', 'platform_admin'
    Address = db.Column(db.String(255), nullable=True)
    Is_Active = db.Column(db.Boolean, default=True, nullable=False)
    Created_At = db.Column(db.DateTime, default=datetime.utcnow)

    # Multi-center & Location fields
    center_id = db.Column(db.Integer, db.ForeignKey('service_centers.id', use_alter=True, name='fk_user_center'), nullable=True)
    city = db.Column(db.String(50), nullable=True)
    area = db.Column(db.String(50), nullable=True)
    state = db.Column(db.String(50), default='Maharashtra', nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)

    # Relationships
    owned_centers = db.relationship('Service_Center', foreign_keys=[Service_Center.owner_user_id], back_populates='owner')
    center = db.relationship('Service_Center', foreign_keys=[center_id])
    mechanic_profile = db.relationship('Mechanic', back_populates='user', uselist=False, cascade='all, delete-orphan')
    vehicles = db.relationship('Vehicle', back_populates='customer', cascade='all, delete-orphan')
    notifications = db.relationship('Notification', back_populates='user', cascade='all, delete-orphan', order_by='Notification.Created_At.desc()')

    def to_dict(self):
        data = {
            "User_ID": self.User_ID,
            "Name": self.Name,
            "Email": self.Email,
            "Contact": self.Contact,
            "Role": self.Role,
            "Address": self.Address,
            "Is_Active": self.Is_Active,
            "Created_At": self.Created_At.isoformat() if self.Created_At else None,
            "center_id": self.center_id,
            "city": self.city,
            "area": self.area,
            "state": self.state,
            "latitude": self.latitude,
            "longitude": self.longitude
        }
        act_center = self.center
        if not act_center and self.owned_centers:
            act_center = self.owned_centers[0]
        if act_center:
            data["Center_ID"] = act_center.id
            data["center_id"] = act_center.id
            data["Center_Name"] = act_center.name
            data["Center_City"] = act_center.city
            data["Center_Code"] = act_center.center_code
            data["center_code"] = act_center.center_code
        if self.Role == 'mechanic' and self.mechanic_profile:
            data["Mechanic_ID"] = self.mechanic_profile.Mechanic_ID
            data["Specialization"] = self.mechanic_profile.Specialization
            data["Is_Available"] = self.mechanic_profile.Is_Available
            data["experience_years"] = self.mechanic_profile.experience_years
            data["rating"] = self.mechanic_profile.rating
        return data


class Mechanic(db.Model):
    __tablename__ = 'mechanics'

    Mechanic_ID = db.Column(db.Integer, primary_key=True)
    User_ID = db.Column(db.Integer, db.ForeignKey('users.User_ID', ondelete='CASCADE'), unique=True, nullable=False)
    center_id = db.Column(db.Integer, db.ForeignKey('service_centers.id'), nullable=True)
    Specialization = db.Column(db.String(120), nullable=True)
    Is_Available = db.Column(db.Boolean, default=True, nullable=False)
    experience_years = db.Column(db.Integer, default=4, nullable=False)
    rating = db.Column(db.Float, default=4.8, nullable=False)
    photo_url = db.Column(db.String(255), nullable=True)

    user = db.relationship('User', back_populates='mechanic_profile')
    center = db.relationship('Service_Center', back_populates='mechanics')
    assigned_requests = db.relationship('Service_Request', back_populates='mechanic')

    def to_dict(self):
        user_dict = self.user.to_dict() if self.user else {}
        name = user_dict.get("Name")
        phone = user_dict.get("Contact")
        email = user_dict.get("Email")
        return {
            "Mechanic_ID": self.Mechanic_ID,
            "id": self.Mechanic_ID,
            "User_ID": self.User_ID,
            "center_id": self.center_id,
            "Center_Name": self.center.name if self.center else None,
            "Specialization": self.Specialization,
            "specialization": self.Specialization,
            "Is_Available": self.Is_Available,
            "is_available": self.Is_Available,
            "experience_years": self.experience_years,
            "rating": round(self.rating, 1) if self.rating else 4.8,
            "photo_url": self.photo_url or f"https://api.dicebear.com/7.x/avataaars/svg?seed={self.User_ID}",
            "Name": name,
            "name": name,
            "Email": email,
            "email": email,
            "Contact": phone,
            "phone": phone,
            "Is_Active": user_dict.get("Is_Active", True),
            "User": user_dict,
            "user": user_dict
        }


class Vehicle(db.Model):
    __tablename__ = 'vehicles'

    Vehicle_ID = db.Column(db.Integer, primary_key=True)
    Customer_ID = db.Column(db.Integer, db.ForeignKey('users.User_ID', ondelete='CASCADE'), nullable=False)
    Registration_Number = db.Column(db.String(20), unique=True, nullable=False)
    Make = db.Column(db.String(50), nullable=False)
    Model = db.Column(db.String(50), nullable=False)
    Year = db.Column(db.Integer, nullable=False)
    Fuel_Type = db.Column(db.String(30), nullable=False)
    Color = db.Column(db.String(30), nullable=False)

    customer = db.relationship('User', back_populates='vehicles')
    requests = db.relationship('Service_Request', back_populates='vehicle', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            "Vehicle_ID": self.Vehicle_ID,
            "Customer_ID": self.Customer_ID,
            "Registration_Number": self.Registration_Number,
            "Make": self.Make,
            "Model": self.Model,
            "Year": self.Year,
            "Fuel_Type": self.Fuel_Type,
            "Color": self.Color
        }


class Service(db.Model):
    __tablename__ = 'services'

    Service_ID = db.Column(db.Integer, primary_key=True)
    Name = db.Column(db.String(120), nullable=False)
    Description = db.Column(db.Text, nullable=True)
    Base_Price = db.Column(db.Float, nullable=False)
    Estimated_Hours = db.Column(db.Float, nullable=False)
    Is_Active = db.Column(db.Boolean, default=True, nullable=False)

    def to_dict(self):
        return {
            "Service_ID": self.Service_ID,
            "Name": self.Name,
            "Description": self.Description,
            "Base_Price": self.Base_Price,
            "Estimated_Hours": self.Estimated_Hours,
            "Is_Active": self.Is_Active
        }


class Center_Service(db.Model):
    __tablename__ = 'center_services'

    id = db.Column(db.Integer, primary_key=True)
    center_id = db.Column(db.Integer, db.ForeignKey('service_centers.id', ondelete='CASCADE'), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey('services.Service_ID', ondelete='CASCADE'), nullable=False)
    price = db.Column(db.Float, nullable=False)
    estimated_hours = db.Column(db.Float, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    center = db.relationship('Service_Center', back_populates='center_services')
    service = db.relationship('Service')

    def to_dict(self):
        return {
            "id": self.id,
            "center_id": self.center_id,
            "service_id": self.service_id,
            "Service_ID": self.service_id,
            "Name": self.service.Name if self.service else None,
            "Description": self.service.Description if self.service else None,
            "price": self.price,
            "Base_Price": self.price,
            "estimated_hours": self.estimated_hours,
            "Estimated_Hours": self.estimated_hours,
            "is_active": self.is_active,
            "Is_Active": self.is_active
        }


class Time_Slot(db.Model):
    __tablename__ = 'time_slots'

    Slot_ID = db.Column(db.Integer, primary_key=True)
    center_id = db.Column(db.Integer, db.ForeignKey('service_centers.id'), nullable=True)
    Date = db.Column(db.String(10), nullable=False)  # YYYY-MM-DD
    Start_Time = db.Column(db.String(10), nullable=False)
    End_Time = db.Column(db.String(10), nullable=False)
    Capacity = db.Column(db.Integer, default=3, nullable=False)
    Booked_Count = db.Column(db.Integer, default=0, nullable=False)

    center = db.relationship('Service_Center', back_populates='slots')
    requests = db.relationship('Service_Request', back_populates='slot')

    def to_dict(self):
        return {
            "Slot_ID": self.Slot_ID,
            "center_id": self.center_id,
            "Date": self.Date,
            "Start_Time": self.Start_Time,
            "End_Time": self.End_Time,
            "Capacity": self.Capacity,
            "Booked_Count": self.Booked_Count,
            "Available_Spots": max(0, self.Capacity - self.Booked_Count),
            "Is_Available": self.Booked_Count < self.Capacity
        }


class Service_Request(db.Model):
    __tablename__ = 'service_requests'

    Request_ID = db.Column(db.Integer, primary_key=True)
    Customer_ID = db.Column(db.Integer, db.ForeignKey('users.User_ID'), nullable=False)
    Vehicle_ID = db.Column(db.Integer, db.ForeignKey('vehicles.Vehicle_ID'), nullable=False)
    Slot_ID = db.Column(db.Integer, db.ForeignKey('time_slots.Slot_ID'), nullable=False)
    center_id = db.Column(db.Integer, db.ForeignKey('service_centers.id'), nullable=True)
    Mechanic_ID = db.Column(db.Integer, db.ForeignKey('mechanics.Mechanic_ID'), nullable=True)
    Status = db.Column(db.String(30), default='Pending Approval', nullable=False)  # Pending Approval, Accepted, Rejected, Assigned, In Progress, Awaiting Parts, Completed, Cancelled
    rejection_reason = db.Column(db.Text, nullable=True)
    accepted_at = db.Column(db.DateTime, nullable=True)
    rejected_at = db.Column(db.DateTime, nullable=True)
    assigned_at = db.Column(db.DateTime, nullable=True)
    Problem_Description = db.Column(db.String(1000), nullable=True)
    Problem_Categories = db.Column(db.JSON, nullable=True)
    Problem_Symptoms = db.Column(db.JSON, nullable=True)
    Problem_Started = db.Column(db.String(50), nullable=True)
    Problem_Frequency = db.Column(db.String(50), nullable=True)
    Urgency = db.Column(db.String(20), default='Routine', nullable=False)  # Routine, Soon, Urgent
    Created_At = db.Column(db.DateTime, default=datetime.utcnow)
    Updated_At = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    Completed_At = db.Column(db.DateTime, nullable=True)

    center = db.relationship('Service_Center', back_populates='requests')
    customer = db.relationship('User', foreign_keys=[Customer_ID])
    vehicle = db.relationship('Vehicle', back_populates='requests')
    slot = db.relationship('Time_Slot', back_populates='requests')
    mechanic = db.relationship('Mechanic', back_populates='assigned_requests')
    service_items = db.relationship('Request_Service_Item', back_populates='request', cascade='all, delete-orphan')
    attachments = db.relationship('Request_Attachment', back_populates='request', cascade='all, delete-orphan')
    status_history = db.relationship('Status_History', back_populates='request', cascade='all, delete-orphan', order_by='Status_History.Timestamp.asc()')
    parts_used = db.relationship('Job_Part_Used', back_populates='request', cascade='all, delete-orphan')
    labour_entries = db.relationship('Job_Labour', back_populates='request', cascade='all, delete-orphan')
    invoice = db.relationship('Invoice', back_populates='request', uselist=False)
    feedback = db.relationship('Customer_Feedback', back_populates='request', uselist=False)

    @property
    def services(self):
        return self.service_items

    def to_dict(self, full=True):
        data = {
            "Request_ID": self.Request_ID,
            "Customer_ID": self.Customer_ID,
            "Customer_Name": self.customer.Name if self.customer else None,
            "Customer_Phone": self.customer.Contact if self.customer else None,
            "Customer_Email": self.customer.Email if self.customer else None,
            "Customer": {
                "User_ID": self.Customer_ID,
                "Name": self.customer.Name if self.customer else None,
                "Contact": self.customer.Contact if self.customer else None,
                "Email": self.customer.Email if self.customer else None
            } if self.customer else None,
            "Vehicle_ID": self.Vehicle_ID,
            "Vehicle": self.vehicle.to_dict() if self.vehicle else None,
            "Slot_ID": self.Slot_ID,
            "Slot": self.slot.to_dict() if self.slot else None,
            "center_id": self.center_id,
            "Center": self.center.to_dict() if self.center else None,
            "Mechanic_ID": self.Mechanic_ID,
            "Mechanic": self.mechanic.to_dict() if self.mechanic else None,
            "Status": self.Status,
            "rejection_reason": self.rejection_reason,
            "accepted_at": self.accepted_at.isoformat() if self.accepted_at else None,
            "rejected_at": self.rejected_at.isoformat() if self.rejected_at else None,
            "assigned_at": self.assigned_at.isoformat() if self.assigned_at else None,
            "Problem_Description": self.Problem_Description,
            "Problem_Categories": self.Problem_Categories or [],
            "Problem_Symptoms": self.Problem_Symptoms or [],
            "Problem_Started": self.Problem_Started,
            "Problem_Frequency": self.Problem_Frequency,
            "Urgency": self.Urgency,
            "Created_At": self.Created_At.isoformat() if self.Created_At else None,
            "Updated_At": self.Updated_At.isoformat() if self.Updated_At else None,
            "Completed_At": self.Completed_At.isoformat() if self.Completed_At else None,
            "Services": [item.to_dict() for item in self.service_items],
            "Invoice_ID": self.invoice.Invoice_ID if self.invoice else None,
            "Invoice_Number": self.invoice.Invoice_Number if self.invoice else None,
            "Invoice_Status": self.invoice.Status if self.invoice else None,
            "Invoice_Total": self.invoice.Total_Amount if self.invoice else None,
            "Feedback": self.feedback.to_dict() if self.feedback else None
        }
        if full:
            data["Attachments"] = [att.to_dict() for att in self.attachments]
            data["Status_History"] = [hist.to_dict() for hist in self.status_history]
            data["Parts_Used"] = [part.to_dict() for part in self.parts_used]
            data["Labour_Entries"] = [labour.to_dict() for labour in self.labour_entries]
        return data


class Request_Service_Item(db.Model):
    __tablename__ = 'request_service_items'

    ID = db.Column(db.Integer, primary_key=True)
    Request_ID = db.Column(db.Integer, db.ForeignKey('service_requests.Request_ID', ondelete='CASCADE'), nullable=False)
    Service_ID = db.Column(db.Integer, db.ForeignKey('services.Service_ID'), nullable=False)
    Unit_Price_At_Time = db.Column(db.Float, nullable=False)

    request = db.relationship('Service_Request', back_populates='service_items')
    service = db.relationship('Service')

    def to_dict(self):
        return {
            "ID": self.ID,
            "Request_ID": self.Request_ID,
            "Service_ID": self.Service_ID,
            "Name": self.service.Name if self.service else None,
            "Description": self.service.Description if self.service else None,
            "Estimated_Hours": self.service.Estimated_Hours if self.service else None,
            "Unit_Price_At_Time": self.Unit_Price_At_Time,
            "Base_Price": self.Unit_Price_At_Time
        }


class Request_Attachment(db.Model):
    __tablename__ = 'request_attachments'

    Attachment_ID = db.Column(db.Integer, primary_key=True)
    Request_ID = db.Column(db.Integer, db.ForeignKey('service_requests.Request_ID', ondelete='CASCADE'), nullable=False)
    Filename = db.Column(db.String(255), nullable=False)
    Stored_Path = db.Column(db.String(255), nullable=False)
    Mime_Type = db.Column(db.String(50), nullable=False)
    Size_Bytes = db.Column(db.Integer, nullable=False)
    Created_At = db.Column(db.DateTime, default=datetime.utcnow)

    request = db.relationship('Service_Request', back_populates='attachments')

    def to_dict(self):
        return {
            "Attachment_ID": self.Attachment_ID,
            "Request_ID": self.Request_ID,
            "Filename": self.Filename,
            "Stored_Path": self.Stored_Path,
            "Mime_Type": self.Mime_Type,
            "Size_Bytes": self.Size_Bytes,
            "Created_At": self.Created_At.isoformat() if self.Created_At else None
        }


class Status_History(db.Model):
    __tablename__ = 'status_history'

    History_ID = db.Column(db.Integer, primary_key=True)
    Request_ID = db.Column(db.Integer, db.ForeignKey('service_requests.Request_ID', ondelete='CASCADE'), nullable=False)
    Status = db.Column(db.String(30), nullable=False)
    Changed_By = db.Column(db.Integer, db.ForeignKey('users.User_ID'), nullable=True)
    Note = db.Column(db.Text, nullable=True)
    Timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    request = db.relationship('Service_Request', back_populates='status_history')
    user = db.relationship('User')

    def to_dict(self):
        return {
            "History_ID": self.History_ID,
            "Request_ID": self.Request_ID,
            "Status": self.Status,
            "Changed_By": self.Changed_By,
            "Changed_By_Name": self.user.Name if self.user else "System",
            "Note": self.Note,
            "Timestamp": self.Timestamp.isoformat() if self.Timestamp else None
        }


class Spare_Part(db.Model):
    __tablename__ = 'spare_parts'
    __table_args__ = (
        db.UniqueConstraint('center_id', 'sku', name='uq_center_part_sku'),
    )

    Part_ID = db.Column(db.Integer, primary_key=True)
    center_id = db.Column(db.Integer, db.ForeignKey('service_centers.id'), nullable=True)
    sku = db.Column(db.String(50), nullable=True, index=True)
    Name = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(80), default='General', nullable=False)
    unit = db.Column(db.String(20), default='piece', nullable=False)
    Price = db.Column(db.Float, nullable=False)
    Quantity_In_Stock = db.Column(db.Integer, default=0, nullable=False)
    Min_Threshold = db.Column(db.Integer, default=5, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    Updated_At = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    center = db.relationship('Service_Center', back_populates='parts')
    adjustments = db.relationship('Stock_Adjustment', back_populates='part', cascade='all, delete-orphan')

    @property
    def stock_status(self):
        from data.default_parts import calculate_stock_status
        return calculate_stock_status(self.Quantity_In_Stock, self.Min_Threshold)["label"]

    @property
    def status_key(self):
        from data.default_parts import calculate_stock_status
        return calculate_stock_status(self.Quantity_In_Stock, self.Min_Threshold)["status"]

    def to_dict(self):
        from data.default_parts import calculate_stock_status
        status_info = calculate_stock_status(self.Quantity_In_Stock, self.Min_Threshold)
        qty = self.Quantity_In_Stock or 0
        price = self.Price or 0.0
        return {
            "Part_ID": self.Part_ID,
            "id": self.Part_ID,
            "center_id": self.center_id,
            "sku": self.sku,
            "SKU": self.sku,
            "Name": self.Name,
            "name": self.Name,
            "category": self.category or "General",
            "Category": self.category or "General",
            "unit": self.unit or "piece",
            "Unit": self.unit or "piece",
            "Price": price,
            "price": price,
            "Quantity_In_Stock": qty,
            "quantity": qty,
            "quantity_in_stock": qty,
            "Min_Threshold": self.Min_Threshold,
            "min_threshold": self.Min_Threshold,
            "min_level": self.Min_Threshold,
            "is_active": self.is_active,
            "Is_Active": self.is_active,
            "status": status_info["status"],
            "status_label": status_info["label"],
            "badge_variant": status_info["badge_variant"],
            "Is_Low_Stock": status_info["status"] in ["low", "out"],
            "Is_Out_Of_Stock": status_info["status"] == "out",
            "stock_value": round(price * qty, 2),
            "Updated_At": self.Updated_At.isoformat() if self.Updated_At else None
        }


class Stock_Adjustment(db.Model):
    __tablename__ = 'stock_adjustments'

    id = db.Column(db.Integer, primary_key=True)
    part_id = db.Column(db.Integer, db.ForeignKey('spare_parts.Part_ID', ondelete='CASCADE'), nullable=False)
    delta = db.Column(db.Integer, nullable=False)
    reason = db.Column(db.String(255), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.User_ID'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    part = db.relationship('Spare_Part', back_populates='adjustments')
    user = db.relationship('User')

    def to_dict(self):
        return {
            "id": self.id,
            "part_id": self.part_id,
            "delta": self.delta,
            "reason": self.reason,
            "user_id": self.user_id,
            "user_name": self.user.Name if self.user else "System",
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Job_Part_Used(db.Model):
    __tablename__ = 'job_parts_used'

    ID = db.Column(db.Integer, primary_key=True)
    Request_ID = db.Column(db.Integer, db.ForeignKey('service_requests.Request_ID', ondelete='CASCADE'), nullable=False)
    Part_ID = db.Column(db.Integer, db.ForeignKey('spare_parts.Part_ID'), nullable=False)
    Quantity = db.Column(db.Integer, nullable=False)
    Unit_Price_At_Time = db.Column(db.Float, nullable=False)

    request = db.relationship('Service_Request', back_populates='parts_used')
    part = db.relationship('Spare_Part')

    def to_dict(self):
        return {
            "ID": self.ID,
            "Request_ID": self.Request_ID,
            "Part_ID": self.Part_ID,
            "Part_Name": self.part.Name if self.part else None,
            "sku": self.part.sku if self.part else None,
            "SKU": self.part.sku if self.part else None,
            "unit": self.part.unit if self.part else "piece",
            "category": self.part.category if self.part else "General",
            "Quantity": self.Quantity,
            "Unit_Price_At_Time": self.Unit_Price_At_Time,
            "Total_Price": round(self.Quantity * self.Unit_Price_At_Time, 2)
        }


class Job_Labour(db.Model):
    __tablename__ = 'job_labour'

    ID = db.Column(db.Integer, primary_key=True)
    Request_ID = db.Column(db.Integer, db.ForeignKey('service_requests.Request_ID', ondelete='CASCADE'), nullable=False)
    Description = db.Column(db.String(255), nullable=False)
    Hours = db.Column(db.Float, nullable=False)
    Rate_Per_Hour = db.Column(db.Float, nullable=False)
    Repair_Notes = db.Column(db.Text, nullable=True)

    request = db.relationship('Service_Request', back_populates='labour_entries')

    def to_dict(self):
        return {
            "ID": self.ID,
            "Request_ID": self.Request_ID,
            "Description": self.Description,
            "Hours": self.Hours,
            "Rate_Per_Hour": self.Rate_Per_Hour,
            "Total_Charge": round(self.Hours * self.Rate_Per_Hour, 2),
            "Repair_Notes": self.Repair_Notes
        }


class Invoice(db.Model):
    __tablename__ = 'invoices'

    Invoice_ID = db.Column(db.Integer, primary_key=True)
    center_id = db.Column(db.Integer, db.ForeignKey('service_centers.id'), nullable=True)
    Request_ID = db.Column(db.Integer, db.ForeignKey('service_requests.Request_ID'), unique=True, nullable=False)
    Invoice_Number = db.Column(db.String(50), unique=True, nullable=False)
    Labour_Charge = db.Column(db.Float, default=0.0, nullable=False)
    Parts_Cost = db.Column(db.Float, default=0.0, nullable=False)
    GST_Rate = db.Column(db.Float, default=18.0, nullable=False)
    GST_Amount = db.Column(db.Float, default=0.0, nullable=False)
    Discount = db.Column(db.Float, default=0.0, nullable=False)
    Total_Amount = db.Column(db.Float, default=0.0, nullable=False)
    Status = db.Column(db.String(20), default='Unpaid', nullable=False)  # Unpaid, Paid
    Created_At = db.Column(db.DateTime, default=datetime.utcnow)

    center = db.relationship('Service_Center', back_populates='invoices')
    request = db.relationship('Service_Request', back_populates='invoice')
    payments = db.relationship('Payment', back_populates='invoice', cascade='all, delete-orphan', order_by='Payment.Created_At.desc()')
    adjustments = db.relationship('Invoice_Adjustment', back_populates='invoice', cascade='all, delete-orphan', order_by='Invoice_Adjustment.Created_At.desc()')
    line_items = db.relationship('Invoice_Line_Item', back_populates='invoice', cascade='all, delete-orphan')

    def to_dict(self):
        # Work repair notes summary from labour entries
        work_notes = []
        if self.request and self.request.labour_entries:
            for l in self.request.labour_entries:
                if l.Repair_Notes:
                    work_notes.append(l.Repair_Notes)

        return {
            "Invoice_ID": self.Invoice_ID,
            "Request_ID": self.Request_ID,
            "center_id": self.center_id,
            "Center": self.center.to_dict() if self.center else (self.request.center.to_dict() if self.request and self.request.center else None),
            "Invoice_Number": self.Invoice_Number,
            "Labour_Charge": self.Labour_Charge,
            "Parts_Cost": self.Parts_Cost,
            "Subtotal": round(self.Labour_Charge + self.Parts_Cost, 2),
            "GST_Rate": self.GST_Rate,
            "GST_Amount": self.GST_Amount,
            "Discount": self.Discount,
            "Total_Amount": self.Total_Amount,
            "Status": self.Status,
            "Created_At": self.Created_At.isoformat() if self.Created_At else None,
            "Customer_Name": self.request.customer.Name if self.request and self.request.customer else None,
            "Customer_Phone": self.request.customer.Contact if self.request and self.request.customer else None,
            "Customer": self.request.customer.to_dict() if self.request and self.request.customer else None,
            "Vehicle_Plate": self.request.vehicle.Registration_Number if self.request and self.request.vehicle else None,
            "Vehicle_Details": f"{self.request.vehicle.Make} {self.request.vehicle.Model} ({self.request.vehicle.Year})" if self.request and self.request.vehicle else None,
            "Vehicle": self.request.vehicle.to_dict() if self.request and self.request.vehicle else None,
            "Mechanic": self.request.mechanic.to_dict() if self.request and self.request.mechanic else None,
            "Repair_Notes_Summary": "; ".join(work_notes) if work_notes else "Routine scheduled service completed.",
            "Appointment_Date": self.request.slot.Date if self.request and self.request.slot else None,
            "Appointment_Time": f"{self.request.slot.Start_Time} - {self.request.slot.End_Time}" if self.request and self.request.slot else None,
            "Completed_At": self.request.Completed_At.isoformat() if self.request and self.request.Completed_At else None,
            "Line_Items": [li.to_dict() for li in self.line_items],
            "Payments": [p.to_dict() for p in self.payments],
            "Adjustments": [a.to_dict() for a in self.adjustments],
            "Labour_Entries": [l.to_dict() for l in self.request.labour_entries] if self.request else [],
            "Parts_Used": [p.to_dict() for p in self.request.parts_used] if self.request else []
        }


class Invoice_Line_Item(db.Model):
    __tablename__ = 'invoice_line_items'

    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoices.Invoice_ID', ondelete='CASCADE'), nullable=False)
    item_type = db.Column(db.String(20), nullable=False)  # 'Service', 'Part', 'Labour'
    description = db.Column(db.String(255), nullable=False)
    quantity = db.Column(db.Float, default=1.0, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    amount = db.Column(db.Float, nullable=False)

    invoice = db.relationship('Invoice', back_populates='line_items')

    def to_dict(self):
        return {
            "id": self.id,
            "invoice_id": self.invoice_id,
            "item_type": self.item_type,
            "description": self.description,
            "quantity": self.quantity,
            "unit_price": self.unit_price,
            "amount": self.amount
        }


class Payment(db.Model):
    __tablename__ = 'payments'

    Payment_ID = db.Column(db.Integer, primary_key=True)
    Invoice_ID = db.Column(db.Integer, db.ForeignKey('invoices.Invoice_ID'), nullable=False)
    Amount = db.Column(db.Float, nullable=False)
    Method = db.Column(db.String(30), nullable=False)  # UPI, Card, NetBanking, Cash
    Transaction_ID = db.Column(db.String(100), unique=True, nullable=False)
    Status = db.Column(db.String(20), nullable=False)  # Success, Failed, Cancelled
    Failure_Reason = db.Column(db.String(255), nullable=True)
    Card_Last4 = db.Column(db.String(4), nullable=True)
    Created_At = db.Column(db.DateTime, default=datetime.utcnow)

    invoice = db.relationship('Invoice', back_populates='payments')

    def to_dict(self):
        return {
            "Payment_ID": self.Payment_ID,
            "payment_id": self.Payment_ID,
            "id": self.Payment_ID,
            "Invoice_ID": self.Invoice_ID,
            "Amount": self.Amount,
            "Method": self.Method,
            "Transaction_ID": self.Transaction_ID,
            "Status": self.Status,
            "Failure_Reason": self.Failure_Reason,
            "Card_Last4": self.Card_Last4,
            "Created_At": self.Created_At.isoformat() if self.Created_At else None
        }


class Invoice_Adjustment(db.Model):
    __tablename__ = 'invoice_adjustments'

    ID = db.Column(db.Integer, primary_key=True)
    Invoice_ID = db.Column(db.Integer, db.ForeignKey('invoices.Invoice_ID'), nullable=False)
    Reason = db.Column(db.String(255), nullable=False)
    Amount = db.Column(db.Float, nullable=False)
    Created_By = db.Column(db.Integer, db.ForeignKey('users.User_ID'), nullable=False)
    Created_At = db.Column(db.DateTime, default=datetime.utcnow)

    invoice = db.relationship('Invoice', back_populates='adjustments')
    author = db.relationship('User')

    def to_dict(self):
        return {
            "ID": self.ID,
            "Invoice_ID": self.Invoice_ID,
            "Reason": self.Reason,
            "Amount": self.Amount,
            "Created_By": self.Created_By,
            "Created_By_Name": self.author.Name if self.author else None,
            "Created_At": self.Created_At.isoformat() if self.Created_At else None
        }


class Customer_Feedback(db.Model):
    __tablename__ = 'customer_feedback'

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('service_requests.Request_ID', ondelete='CASCADE'), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('users.User_ID'), nullable=False)
    center_id = db.Column(db.Integer, db.ForeignKey('service_centers.id'), nullable=False)
    mechanic_id = db.Column(db.Integer, db.ForeignKey('mechanics.Mechanic_ID'), nullable=True)
    rating = db.Column(db.Integer, nullable=False)  # 1 to 5
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    request = db.relationship('Service_Request', back_populates='feedback')
    customer = db.relationship('User')
    center = db.relationship('Service_Center', back_populates='feedbacks')
    mechanic = db.relationship('Mechanic')

    def to_dict(self):
        return {
            "id": self.id,
            "request_id": self.request_id,
            "customer_id": self.customer_id,
            "customer_name": self.customer.Name if self.customer else "Anonymous",
            "center_id": self.center_id,
            "mechanic_id": self.mechanic_id,
            "mechanic_name": self.mechanic.user.Name if self.mechanic and self.mechanic.user else None,
            "rating": self.rating,
            "comment": self.comment,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Notification(db.Model):
    __tablename__ = 'notifications'

    Notification_ID = db.Column(db.Integer, primary_key=True)
    User_ID = db.Column(db.Integer, db.ForeignKey('users.User_ID', ondelete='CASCADE'), nullable=False)
    Message = db.Column(db.Text, nullable=False)
    Channel = db.Column(db.String(20), default='in_app', nullable=False)  # in_app, sms, email
    Is_Read = db.Column(db.Boolean, default=False, nullable=False)
    Created_At = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', back_populates='notifications')

    def to_dict(self):
        return {
            "Notification_ID": self.Notification_ID,
            "User_ID": self.User_ID,
            "Message": self.Message,
            "Channel": self.Channel,
            "Is_Read": self.Is_Read,
            "Created_At": self.Created_At.isoformat() if self.Created_At else None
        }


class Contact_Message(db.Model):
    __tablename__ = 'contact_messages'

    ID = db.Column(db.Integer, primary_key=True)
    Name = db.Column(db.String(120), nullable=False)
    Phone = db.Column(db.String(20), nullable=False)
    Email = db.Column(db.String(120), nullable=False)
    Message = db.Column(db.Text, nullable=False)
    Created_At = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "ID": self.ID,
            "Name": self.Name,
            "Phone": self.Phone,
            "Email": self.Email,
            "Message": self.Message,
            "Created_At": self.Created_At.isoformat() if self.Created_At else None
        }
