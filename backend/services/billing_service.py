from datetime import datetime
from extensions import db
from models import Invoice, Service_Request, Invoice_Adjustment, Invoice_Line_Item
from services.notification_service import notify_user

def generate_invoice_number():
    year = datetime.utcnow().year
    count = Invoice.query.filter(Invoice.Invoice_Number.like(f"INV-{year}-%")).count() + 1
    code = f"INV-{year}-{count:04d}"
    while Invoice.query.filter_by(Invoice_Number=code).first():
        count += 1
        code = f"INV-{year}-{count:04d}"
    return code

def calculate_and_create_invoice(request_id: int, discount: float = 0.0) -> Invoice:
    """
    Calculates charges from services, labour and parts, computes GST 18%,
    creates Unpaid invoice with itemized line items, and dispatches customer notification.
    """
    service_request = db.session.get(Service_Request, request_id)
    if not service_request:
        raise LookupError("Service request not found")

    if service_request.invoice:
        return service_request.invoice

    services_total = sum(item.Unit_Price_At_Time for item in service_request.service_items) if service_request.service_items else 0.0
    labour_total = sum(item.Hours * item.Rate_Per_Hour for item in service_request.labour_entries) if service_request.labour_entries else 0.0
    parts_total = sum(item.Quantity * item.Unit_Price_At_Time for item in service_request.parts_used) if service_request.parts_used else 0.0
    
    total_labour_and_svc = round(services_total + labour_total, 2)
    subtotal = round(total_labour_and_svc + parts_total, 2)
    gst_rate = 18.0
    gst_amount = round(subtotal * (gst_rate / 100.0), 2)
    total_amount = round(subtotal + gst_amount - discount, 2)
    if total_amount < 0:
        total_amount = 0.0

    invoice = Invoice(
        center_id=service_request.center_id,
        Request_ID=service_request.Request_ID,
        Invoice_Number=generate_invoice_number(),
        Labour_Charge=total_labour_and_svc,
        Parts_Cost=round(parts_total, 2),
        GST_Rate=gst_rate,
        GST_Amount=gst_amount,
        Discount=round(discount, 2),
        Total_Amount=total_amount,
        Status='Unpaid',
        Created_At=datetime.utcnow()
    )
    db.session.add(invoice)
    db.session.flush()

    # Generate itemized line items
    if service_request.service_items:
        for item in service_request.service_items:
            svc_name = item.service.Name if item.service else "Service"
            db.session.add(Invoice_Line_Item(
                invoice_id=invoice.Invoice_ID,
                item_type="Service",
                description=svc_name,
                quantity=1.0,
                unit_price=float(item.Unit_Price_At_Time),
                amount=float(item.Unit_Price_At_Time)
            ))

    if service_request.parts_used:
        for pu in service_request.parts_used:
            p_name = pu.part.Name if pu.part else "Spare Part"
            sku = pu.part.sku if pu.part and pu.part.sku else None
            desc = f"{p_name} ({sku})" if sku else p_name
            db.session.add(Invoice_Line_Item(
                invoice_id=invoice.Invoice_ID,
                item_type="Part",
                description=desc,
                quantity=float(pu.Quantity),
                unit_price=float(pu.Unit_Price_At_Time),
                amount=round(pu.Quantity * pu.Unit_Price_At_Time, 2)
            ))

    if service_request.labour_entries:
        for le in service_request.labour_entries:
            desc = le.Description
            if le.Repair_Notes:
                desc += f" (Notes: {le.Repair_Notes})"
            db.session.add(Invoice_Line_Item(
                invoice_id=invoice.Invoice_ID,
                item_type="Labour",
                description=desc,
                quantity=float(le.Hours),
                unit_price=float(le.Rate_Per_Hour),
                amount=round(le.Hours * le.Rate_Per_Hour, 2)
            ))

    db.session.commit()

    # Notify Customer
    reg_num = service_request.vehicle.Registration_Number if service_request.vehicle else "Vehicle"
    notify_user(
        service_request.Customer_ID,
        f"Service completed for vehicle {reg_num}. Invoice {invoice.Invoice_Number} generated for Rs. {invoice.Total_Amount:.2f}."
    )

    return invoice

def add_invoice_adjustment(invoice_id: int, reason: str, amount: float, created_by_user_id: int) -> Invoice_Adjustment:
    """
    Adds an adjustment entry to an existing invoice.
    Rule: Paid invoices cannot be arbitrarily modified without proper adjustment record.
    """
    invoice = db.session.get(Invoice, invoice_id)
    if not invoice:
        raise LookupError("Invoice not found")

    if not reason or not reason.strip():
        raise ValueError("Adjustment reason is required")

    adjustment = Invoice_Adjustment(
        Invoice_ID=invoice.Invoice_ID,
        Reason=reason.strip(),
        Amount=round(amount, 2),
        Created_By=created_by_user_id,
        Created_At=datetime.utcnow()
    )
    db.session.add(adjustment)
    invoice.Total_Amount = round(max(0.0, invoice.Total_Amount + amount), 2)
    db.session.commit()
    return adjustment
