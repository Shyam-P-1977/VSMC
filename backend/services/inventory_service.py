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

    # Center isolation check
    if service_request.center_id and part.center_id and service_request.center_id != part.center_id:
        raise PermissionError(f"Part belongs to Center #{part.center_id}, but request is for Center #{service_request.center_id}")

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

def seed_default_parts(center_id: int):
    """
    Seeds the 44 default spare parts catalog for a service center.
    Idempotent:
      - Skips if a part with the same SKU already exists for this center.
      - Also skips if a part with the same Name already exists for this center.
      - Never overwrites existing stock or price.
      - Does not emit notifications during seeding.
    Returns:
      dict: {"added": int, "skipped": int}
    """
    from data.default_parts import DEFAULT_SPARE_PARTS

    existing_parts = Spare_Part.query.filter_by(center_id=center_id).all()
    existing_skus = {p.sku for p in existing_parts if p.sku}
    existing_names = {p.Name.strip().lower() for p in existing_parts if p.Name}

    added = 0
    skipped = 0

    for item in DEFAULT_SPARE_PARTS:
        sku = item["sku"]
        name_lower = item["name"].strip().lower()

        if sku in existing_skus or name_lower in existing_names:
            skipped += 1
            continue

        new_part = Spare_Part(
            center_id=center_id,
            sku=sku,
            Name=item["name"],
            category=item.get("category", "General"),
            unit=item.get("unit", "piece"),
            Price=float(item["price"]),
            Quantity_In_Stock=int(item["initial_qty"]),
            Min_Threshold=int(item["min_threshold"]),
            is_active=True
        )
        db.session.add(new_part)
        existing_skus.add(sku)
        existing_names.add(name_lower)
        added += 1

    if added > 0:
        db.session.commit()

    return {"added": added, "skipped": skipped}

def record_stock_adjustment(part_id: int, delta: int, reason: str = None, user_id: int = None):
    """
    Adjusts stock count (+ or -) and logs to stock_adjustments table.
    Validates that quantity never drops below 0.
    """
    from models import Stock_Adjustment
    part = db.session.get(Spare_Part, part_id)
    if not part:
        raise LookupError("Spare part not found")

    new_qty = part.Quantity_In_Stock + delta
    if new_qty < 0:
        raise ValueError(f"Stock quantity cannot be negative (current: {part.Quantity_In_Stock}, requested change: {delta})")

    part.Quantity_In_Stock = new_qty
    adj = Stock_Adjustment(
        part_id=part.Part_ID,
        delta=delta,
        reason=reason,
        user_id=user_id
    )
    db.session.add(adj)

    # Low stock notification if stock decreased
    if delta < 0 and part.Quantity_In_Stock <= part.Min_Threshold:
        notify_admins(f"Low Stock Alert: Part '{part.Name}' has only {part.Quantity_In_Stock} units remaining (Threshold: {part.Min_Threshold}).")

    db.session.commit()
    return part, adj
