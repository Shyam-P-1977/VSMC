from extensions import db
from models import Spare_Part, Job_Part_Used, Service_Request, Status_History
from services.notification_service import notify_admins

def add_part_to_job(request_id: int, part_id: int, quantity: int, changed_by_user_id: int = None):
    """
    Deducts stock and records a part used in a service request.
    If stock is insufficient, changes request status to 'Awaiting Parts' and notifies Admin.
    If stock drops to or below threshold, alerts Admin.
    """
    if quantity <= 0:
        raise ValueError("Part quantity must be greater than 0")

    service_request = db.session.get(Service_Request, request_id)
    if not service_request:
        raise LookupError("Service request not found")

    if service_request.Status in ['Completed', 'Cancelled']:
        raise ValueError(f"Cannot modify parts for a {service_request.Status} request")

    part = db.session.get(Spare_Part, part_id)
    if not part:
        raise LookupError("Spare part not found")

    # Check sufficient stock
    if part.Quantity_In_Stock < quantity:
        # Insufficient stock: Transition request to 'Awaiting Parts'
        previous_status = service_request.Status
        service_request.Status = 'Awaiting Parts'
        history = Status_History(
            Request_ID=service_request.Request_ID,
            Status='Awaiting Parts',
            Changed_By=changed_by_user_id,
            Note=f"Insufficient stock for part '{part.Name}'. Requested {quantity}, in stock {part.Quantity_In_Stock}."
        )
        db.session.add(history)
        notify_admins(f"Part Shortage: Job #{service_request.Request_ID} moved to 'Awaiting Parts' due to shortage of '{part.Name}'.")
        db.session.commit()
        raise ValueError(f"Insufficient stock for '{part.Name}' ({part.Quantity_In_Stock} available). Job marked as 'Awaiting Parts'.")

    # Auto deduct
    part.Quantity_In_Stock -= quantity
    
    # Record part used
    job_part = Job_Part_Used(
        Request_ID=service_request.Request_ID,
        Part_ID=part.Part_ID,
        Quantity=quantity,
        Unit_Price_At_Time=part.Price
    )
    db.session.add(job_part)

    # Check low stock threshold
    if part.Quantity_In_Stock <= part.Min_Threshold:
        notify_admins(f"Low Stock Alert: Part '{part.Name}' has only {part.Quantity_In_Stock} units remaining (Threshold: {part.Min_Threshold}).")

    db.session.commit()
    return job_part

def remove_part_from_job(request_id: int, job_part_id: int):
    """
    Removes a used part from a job and restores the stock count.
    """
    job_part = db.session.get(Job_Part_Used, job_part_id)
    if not job_part or job_part.Request_ID != request_id:
        raise LookupError("Used part entry not found for this request")

    service_request = db.session.get(Service_Request, request_id)
    if service_request.Status in ['Completed', 'Cancelled']:
        raise ValueError(f"Cannot modify parts for a {service_request.Status} request")

    part = db.session.get(Spare_Part, job_part.Part_ID)
    if part:
        part.Quantity_In_Stock += job_part.Quantity

    db.session.delete(job_part)
    db.session.commit()
    return True
