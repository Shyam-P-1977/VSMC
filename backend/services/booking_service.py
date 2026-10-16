import uuid
from datetime import datetime, date, timedelta
from extensions import db
from models import (
    Time_Slot, Service_Request, Request_Service_Item, Status_History,
    Service, Center_Service, Mechanic, Service_Center
)
from services.notification_service import notify_user, notify_admins

HOURLY_SLOTS = [
    ("09:00", "10:00"),
    ("10:00", "11:00"),
    ("11:00", "12:00"),
    ("12:00", "13:00"),
    ("14:00", "15:00"),
    ("15:00", "16:00"),
    ("16:00", "17:00"),
    ("17:00", "18:00")
]

def ensure_slots_for_date(target_date_str: str, center_id: int = None):
    """
    Ensures 09:00 - 18:00 hourly slots exist for the given date (YYYY-MM-DD),
    scoped to center_id if provided.
    """
    query = Time_Slot.query.filter_by(Date=target_date_str)
    if center_id is not None:
        query = query.filter_by(center_id=center_id)
    
    existing = query.all()
    if existing:
        return existing

    new_slots = []
    for start_time, end_time in HOURLY_SLOTS:
        slot = Time_Slot(
            center_id=center_id,
            Date=target_date_str,
            Start_Time=start_time,
            End_Time=end_time,
            Capacity=3,
            Booked_Count=0
        )
        db.session.add(slot)
        new_slots.append(slot)
    db.session.commit()

    query = Time_Slot.query.filter_by(Date=target_date_str)
    if center_id is not None:
        query = query.filter_by(center_id=center_id)
    return query.order_by(Time_Slot.Start_Time.asc()).all()

def find_alternate_slots(date_str: str, center_id: int = None, limit: int = 3):
    """
    Finds up to limit alternate available slots on the same date or upcoming days,
    scoped to the specific center.
    """
    query = Time_Slot.query.filter(
        Time_Slot.Date == date_str,
        Time_Slot.Booked_Count < Time_Slot.Capacity
    )
    if center_id is not None:
        query = query.filter(Time_Slot.center_id == center_id)

    alternates = query.order_by(Time_Slot.Start_Time.asc()).limit(limit).all()
    results = [s.to_dict() for s in alternates]

    if len(results) >= limit:
        return results[:limit]

    # Check next 4 days
    try:
        base_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except Exception:
        base_date = date.today()

    for d_offset in range(1, 5):
        if len(results) >= limit:
            break
        next_date_str = (base_date + timedelta(days=d_offset)).isoformat()
        ensure_slots_for_date(next_date_str, center_id=center_id)
        
        n_query = Time_Slot.query.filter(
            Time_Slot.Date == next_date_str,
            Time_Slot.Booked_Count < Time_Slot.Capacity
        )
        if center_id is not None:
            n_query = n_query.filter(Time_Slot.center_id == center_id)
            
        next_slots = n_query.order_by(Time_Slot.Start_Time.asc()).limit(limit - len(results)).all()
        results.extend([s.to_dict() for s in next_slots])

    return results[:limit]

def check_slot_availability(slot_id: int, center_id: int = None):
    """
    Checks if a slot is available (Booked_Count < Capacity).
    Returns dict with available boolean and up to 3 alternate slots if unavailable.
    """
    slot = db.session.get(Time_Slot, slot_id)
    if not slot:
        return {
            "available": False,
            "error": "Time slot not found",
            "alternates": []
        }

    if center_id is not None and slot.center_id != center_id:
        return {
            "available": False,
            "error": "Time slot does not belong to the selected service center",
            "alternates": []
        }

    is_available = slot.Booked_Count < slot.Capacity
    alternates = []
    if not is_available:
        target_center = slot.center_id or center_id
        alternates = find_alternate_slots(slot.Date, center_id=target_center, limit=3)

    return {
        "available": is_available,
        "slot": slot.to_dict(),
        "alternates": alternates
    }

def create_booking(customer_id: int, vehicle_id: int, slot_id: int, service_ids: list, problem_data: dict, center_id: int = None):
    """
    Atomically verifies slot capacity and creates the service request in 'Pending Approval' status.
    If full, raises an error with alternate slots.
    """
    slot = db.session.query(Time_Slot).with_for_update().filter_by(Slot_ID=slot_id).first()
    if not slot:
        raise LookupError("Time slot does not exist")

    # If center_id is provided, verify match
    if not center_id and not slot.center_id:
        raise ValueError("A valid service center must be specified for booking.")
    effective_center_id = center_id or slot.center_id
    if slot.center_id and center_id and slot.center_id != center_id:
        raise ValueError("Selected slot belongs to a different service center")

    if slot.Booked_Count >= slot.Capacity:
        alternates = find_alternate_slots(slot.Date, center_id=effective_center_id, limit=3)
        err = ValueError("Selected time slot is fully booked")
        err.alternates = alternates
        raise err

    problem_categories = problem_data.get("problem_categories", [])
    problem_desc = problem_data.get("problem_description", "").strip()

    # If 'Other' or 'Other / My problem is not in the list' is selected, description is required (min 10 chars)
    is_other_selected = any("other" in str(cat).lower() for cat in problem_categories)
    if is_other_selected:
        if len(problem_desc) < 10:
            raise ValueError("When selecting 'Other', a problem description of at least 10 characters is required.")

    urgency = problem_data.get("urgency", "Routine")
    if urgency not in ["Routine", "Soon", "Urgent"]:
        urgency = "Routine"

    # Create service request in 'Pending Approval'
    req = Service_Request(
        center_id=effective_center_id,
        Customer_ID=customer_id,
        Vehicle_ID=vehicle_id,
        Slot_ID=slot.Slot_ID,
        Mechanic_ID=None,
        Status="Pending Approval",
        Problem_Description=problem_desc,
        Problem_Categories=problem_categories,
        Problem_Symptoms=problem_data.get("problem_symptoms", []),
        Problem_Started=problem_data.get("problem_started"),
        Problem_Frequency=problem_data.get("problem_frequency"),
        Urgency=urgency,
        Created_At=datetime.utcnow()
    )
    db.session.add(req)
    db.session.flush()

    # Attach selected services with center-specific price if available
    for sid in (service_ids or []):
        service = db.session.get(Service, sid)
        if service and service.Is_Active:
            # Check for center-specific pricing
            c_svc = Center_Service.query.filter_by(center_id=effective_center_id, service_id=service.Service_ID, is_active=True).first()
            unit_price = c_svc.price if c_svc else service.Base_Price
            
            item = Request_Service_Item(
                Request_ID=req.Request_ID,
                Service_ID=service.Service_ID,
                Unit_Price_At_Time=unit_price
            )
            db.session.add(item)

    # Reserve the slot
    slot.Booked_Count += 1

    # Record initial status history
    history = Status_History(
        Request_ID=req.Request_ID,
        Status="Pending Approval",
        Changed_By=customer_id,
        Note="Appointment request submitted by customer. Awaiting service center approval."
    )
    db.session.add(history)

    # Notifications
    center_name = req.center.name if req.center else "Service Center"
    notify_user(customer_id, f"Appointment request #{req.Request_ID} sent to {center_name}. We will notify you once approved.")
    
    # Notify center owner / manager
    if req.center and req.center.owner_user_id:
        notify_user(req.center.owner_user_id, f"New appointment request #{req.Request_ID} received for {slot.Date} {slot.Start_Time} ({urgency}).")

    if urgency == "Urgent":
        from services.notification_service import notify_center_admins
        notify_center_admins(effective_center_id, f"URGENT BOOKING ALERT: Request #{req.Request_ID} at {center_name} marked Urgent!")

    db.session.commit()
    return req

def cancel_booking(request_id: int, user_id: int, note: str = "Cancelled by user"):
    """
    Cancels a request if it is still Pending, Pending Approval, or Accepted, freeing the slot capacity.
    """
    req = db.session.get(Service_Request, request_id)
    if not req:
        raise LookupError("Service request not found")

    allowed_statuses = ["Pending", "Pending Approval", "Accepted", "Assigned"]
    if req.Status not in allowed_statuses:
        raise ValueError(f"Cannot cancel a booking in '{req.Status}' status. Service is already underway or finalized.")

    req.Status = "Cancelled"
    
    # Free slot
    if req.slot and req.slot.Booked_Count > 0:
        req.slot.Booked_Count -= 1

    # If mechanic was assigned, free them
    if req.mechanic:
        req.mechanic.Is_Available = True

    history = Status_History(
        Request_ID=req.Request_ID,
        Status="Cancelled",
        Changed_By=user_id,
        Note=note
    )
    db.session.add(history)
    notify_user(req.Customer_ID, f"Your service booking #{req.Request_ID} has been cancelled.")

    db.session.commit()
    return req

def accept_booking(request_id: int, user_id: int):
    """
    Service center accepts an appointment request. Slot remains held.
    """
    req = db.session.get(Service_Request, request_id)
    if not req:
        raise LookupError("Service request not found")

    if req.Status not in ["Pending Approval", "Pending"]:
        raise ValueError(f"Only requests in 'Pending Approval' can be accepted (current: '{req.Status}')")

    req.Status = "Accepted"
    req.accepted_at = datetime.utcnow()

    history = Status_History(
        Request_ID=req.Request_ID,
        Status="Accepted",
        Changed_By=user_id,
        Note="Appointment request accepted by service center."
    )
    db.session.add(history)

    center_name = req.center.name if req.center else "Service Center"
    date_info = f" for {req.slot.Date} at {req.slot.Start_Time}" if req.slot else ""
    notify_user(req.Customer_ID, f"Great news! Your appointment #{req.Request_ID} has been accepted by {center_name}{date_info}.")

    db.session.commit()
    return req

def reject_booking(request_id: int, user_id: int, reason: str):
    """
    Service center rejects an appointment request. Reason is required (min 10 chars).
    Slot is automatically released.
    """
    req = db.session.get(Service_Request, request_id)
    if not req:
        raise LookupError("Service request not found")

    if req.Status not in ["Pending Approval", "Pending", "Accepted"]:
        raise ValueError(f"Cannot reject request in '{req.Status}' status")

    reason_clean = (reason or "").strip()
    if len(reason_clean) < 10:
        raise ValueError("A rejection reason of at least 10 characters is required.")

    req.Status = "Rejected"
    req.rejected_at = datetime.utcnow()
    req.rejection_reason = reason_clean

    # Release slot
    if req.slot and req.slot.Booked_Count > 0:
        req.slot.Booked_Count -= 1

    history = Status_History(
        Request_ID=req.Request_ID,
        Status="Rejected",
        Changed_By=user_id,
        Note=f"Appointment rejected: {reason_clean}"
    )
    db.session.add(history)

    center_name = req.center.name if req.center else "Service Center"
    notify_user(
        req.Customer_ID,
        f"Your appointment request #{req.Request_ID} at {center_name} was not accepted. Reason: {reason_clean}. You can choose another slot or center."
    )

    db.session.commit()
    return req

def assign_mechanic_to_request(request_id: int, mechanic_id: int, user_id: int):
    """
    Assigns an active mechanic belonging to the SAME service center to the request.
    """
    req = db.session.get(Service_Request, request_id)
    if not req:
        raise LookupError("Service request not found")

    if req.Status in ["Completed", "Cancelled", "Rejected"]:
        raise ValueError(f"Cannot assign mechanic to a request in '{req.Status}' status")

    mech = db.session.get(Mechanic, mechanic_id)
    if not mech or not (mech.user and mech.user.Is_Active):
        raise LookupError("Mechanic not found or inactive")

    # Center isolation check
    if req.center_id and mech.center_id and req.center_id != mech.center_id:
        raise PermissionError(f"Mechanic '{mech.user.Name}' belongs to a different service center (Center #{mech.center_id})")

    req.Mechanic_ID = mech.Mechanic_ID
    req.Status = "Assigned"
    req.assigned_at = datetime.utcnow()

    history = Status_History(
        Request_ID=req.Request_ID,
        Status="Assigned",
        Changed_By=user_id,
        Note=f"Assigned to mechanic {mech.user.Name}"
    )
    db.session.add(history)

    # Notify Mechanic
    notify_user(mech.User_ID, f"You have been assigned to Service Request #{req.Request_ID}.")

    # Notify Customer with mechanic details
    notify_user(
        req.Customer_ID,
        f"Mechanic {mech.user.Name} ({mech.Specialization or 'General Specialist'}) has been assigned to your service request #{req.Request_ID}."
    )

    db.session.commit()
    return req
