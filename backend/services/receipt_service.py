import io
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def build_receipt_dict(payment):
    invoice = payment.invoice
    req = invoice.request if invoice else None
    customer = req.customer if req else None
    vehicle = req.vehicle if req else None
    mechanic = req.mechanic if req else None
    center = (req.center if req and req.center else (invoice.center if invoice and invoice.center else None))

    # Next service due (approx 6 months from completion)
    comp_date = req.Completed_At if req and req.Completed_At else (payment.Created_At or datetime.utcnow())
    next_due = (comp_date + timedelta(days=180)).strftime("%d %b %Y")

    # Itemized items with SKU and unit mapping
    parts_map = {}
    if req and req.parts_used:
        for pu in req.parts_used:
            if pu.part:
                parts_map[pu.part.Name] = {
                    "sku": pu.part.sku,
                    "unit": pu.part.unit
                }

    items = []
    if invoice and invoice.line_items and len(invoice.line_items) > 0:
        for li in invoice.line_items:
            part_info = parts_map.get(li.description) or {}
            items.append({
                "type": li.item_type,
                "item_type": li.item_type,
                "description": li.description,
                "sku": part_info.get("sku"),
                "unit": part_info.get("unit", "piece" if li.item_type == "Part" else "hrs" if li.item_type == "Labour" else None),
                "quantity": li.quantity,
                "unit_price": li.unit_price,
                "amount": li.amount
            })
    else:
        # Fallback from request items if line_items not yet populated
        if req and req.service_items:
            for s in req.service_items:
                items.append({
                    "type": "Service",
                    "item_type": "Service",
                    "description": s.service.Name if s.service else "Service",
                    "quantity": 1.0,
                    "unit_price": s.Unit_Price_At_Time,
                    "amount": s.Unit_Price_At_Time
                })
        if req and req.parts_used:
            for p in req.parts_used:
                items.append({
                    "type": "Part",
                    "item_type": "Part",
                    "description": p.part.Name if p.part else "Part",
                    "sku": p.part.sku if p.part else None,
                    "unit": p.part.unit if p.part else "piece",
                    "quantity": float(p.Quantity),
                    "unit_price": p.Unit_Price_At_Time,
                    "amount": round(p.Quantity * p.Unit_Price_At_Time, 2)
                })
        if req and req.labour_entries:
            for l in req.labour_entries:
                desc = l.Description
                if l.Repair_Notes:
                    desc += f" ({l.Repair_Notes})"
                items.append({
                    "type": "Labour",
                    "description": desc,
                    "quantity": float(l.Hours),
                    "unit_price": float(l.Rate_Per_Hour),
                    "amount": round(l.Hours * l.Rate_Per_Hour, 2)
                })

    # Work performed / repair notes
    work_notes = []
    if req and req.labour_entries:
        for l in req.labour_entries:
            if l.Repair_Notes:
                work_notes.append(l.Repair_Notes)

    return {
        "receipt_id": f"REC-{payment.Payment_ID:05d}",
        "payment_id": payment.Payment_ID,
        "transaction_id": payment.Transaction_ID,
        "payment_date": payment.Created_At.strftime("%d %b %Y, %I:%M %p") if payment.Created_At else None,
        "payment_method": payment.Method,
        "card_last4": payment.Card_Last4,
        "amount_paid": payment.Amount,
        "status": "PAID",
        "invoice_number": invoice.Invoice_Number if invoice else None,
        "invoice_id": invoice.Invoice_ID if invoice else None,
        "center": {
            "name": center.name if center else "VSCMS Authorized Workshop",
            "address": center.address if center else "Main Workshop Road",
            "city": center.city if center else "Pune",
            "area": center.area if center else "Central",
            "state": center.state if center else "Maharashtra",
            "pincode": center.pincode if center else "411001",
            "phone": center.phone if center else "+91 98765 43210",
            "email": center.email if center else "workshop@vscms.com",
            "gstin": "27AABCV1234F1Z8"
        },
        "customer": {
            "name": customer.Name if customer else "Customer",
            "phone": customer.Contact if customer else None,
            "email": customer.Email if customer else None,
            "address": customer.Address if customer else None
        },
        "vehicle": {
            "registration_number": vehicle.Registration_Number if vehicle else "N/A",
            "make": vehicle.Make if vehicle else "",
            "model": vehicle.Model if vehicle else "",
            "year": vehicle.Year if vehicle else "",
            "fuel_type": vehicle.Fuel_Type if vehicle else ""
        },
        "mechanic": {
            "name": mechanic.user.Name if mechanic and mechanic.user else "Assigned Specialist",
            "phone": mechanic.user.Contact if mechanic and mechanic.user else "+91 98765 00000",
            "specialization": mechanic.Specialization if mechanic else "Automotive Technician",
            "experience_years": getattr(mechanic, 'experience_years', 4) or 4,
            "rating": getattr(mechanic, 'rating', 4.8) or 4.8
        } if mechanic else None,
        "service_date": req.slot.Date if req and req.slot else None,
        "completion_date": req.Completed_At.strftime("%d %b %Y, %I:%M %p") if req and req.Completed_At else None,
        "next_service_due": next_due,
        "work_performed": work_notes,
        "items": items,
        "subtotal": round((invoice.Labour_Charge + invoice.Parts_Cost), 2) if invoice else payment.Amount,
        "labour_charge": invoice.Labour_Charge if invoice else 0.0,
        "parts_cost": invoice.Parts_Cost if invoice else 0.0,
        "gst_rate": invoice.GST_Rate if invoice else 18.0,
        "gst_amount": invoice.GST_Amount if invoice else 0.0,
        "discount": invoice.Discount if invoice else 0.0,
        "total_amount": invoice.Total_Amount if invoice else payment.Amount
    }

def generate_receipt_pdf(payment):
    data = build_receipt_dict(payment)
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    primary_color = colors.HexColor("#0D9488") # Teal 600
    dark_color = colors.HexColor("#0F172A")    # Slate 900
    gray_color = colors.HexColor("#64748B")    # Slate 500
    light_bg = colors.HexColor("#F8FAFC")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=primary_color,
        leading=24
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=gray_color,
        leading=12
    )
    section_title = ParagraphStyle(
        'SecTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        textColor=dark_color,
        leading=14
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=dark_color,
        leading=13
    )
    paid_badge = ParagraphStyle(
        'PaidBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=colors.HexColor("#16A34A"),
        alignment=2 # Right align
    )

    elements = []

    # Header: Center Info (Left) & Receipt Meta (Right)
    c_info = f"""
    <b>{data['center']['name']}</b><br/>
    {data['center']['address']}, {data['center']['area']}, {data['center']['city']} - {data['center']['pincode']}<br/>
    Phone: {data['center']['phone']} | Email: {data['center']['email']}<br/>
    GSTIN: {data['center']['gstin']}
    """
    
    card_suffix = f" (ending {data['card_last4']})" if data.get('card_last4') else ""
    r_meta = f"""
    <b>TAX INVOICE & PAYMENT RECEIPT</b><br/>
    <b>Receipt No:</b> {data['receipt_id']}<br/>
    <b>Invoice No:</b> {data['invoice_number']}<br/>
    <b>Date:</b> {data['payment_date']}<br/>
    <b>Txn ID:</b> {data['transaction_id']}<br/>
    <b>Mode:</b> {data['payment_method']}{card_suffix}
    """

    header_table = Table([
        [Paragraph(c_info, body_style), Paragraph(r_meta, body_style)]
    ], colWidths=[3.8 * inch, 3.4 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(header_table)
    elements.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=10))

    # Two column info box: Customer & Vehicle + Mechanic
    cust_text = f"""
    <b>CUSTOMER DETAILS:</b><br/>
    Name: {data['customer']['name']}<br/>
    Phone: {data['customer']['phone'] or 'N/A'}<br/>
    Email: {data['customer']['email'] or 'N/A'}
    """

    veh_text = f"""
    <b>VEHICLE DETAILS:</b><br/>
    Reg No: <b>{data['vehicle']['registration_number']}</b><br/>
    Make & Model: {data['vehicle']['make']} {data['vehicle']['model']} ({data['vehicle']['year']})<br/>
    Next Service Due: <b>{data['next_service_due']}</b>
    """

    mech_text = ""
    if data['mechanic']:
        mech_text = f"""<br/><b>SERVICED BY:</b> {data['mechanic']['name']} ({data['mechanic']['specialization']}, {data['mechanic']['experience_years']} yrs exp)"""

    info_table = Table([
        [Paragraph(cust_text, body_style), Paragraph(veh_text + mech_text, body_style)]
    ], colWidths=[3.6 * inch, 3.6 * inch])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), light_bg),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 12))

    # Itemized Breakdown Table
    elements.append(Paragraph("<b>ITEMIZED CHARGES & WORK SUMMARY</b>", section_title))
    elements.append(Spacer(1, 6))

    table_data = [
        [
            Paragraph("<b>#</b>", body_style),
            Paragraph("<b>Type</b>", body_style),
            Paragraph("<b>Description / Work Performed</b>", body_style),
            Paragraph("<b>Qty / Hrs</b>", body_style),
            Paragraph("<b>Rate (₹)</b>", body_style),
            Paragraph("<b>Amount (₹)</b>", body_style)
        ]
    ]

    for idx, item in enumerate(data['items'], start=1):
        table_data.append([
            str(idx),
            item['type'],
            item['description'],
            f"{item['quantity']:.1f}" if item['type'] == 'Labour' else f"{int(item['quantity'])}",
            f"₹{item['unit_price']:.2f}",
            f"₹{item['amount']:.2f}"
        ])

    items_table = Table(table_data, colWidths=[0.3 * inch, 0.9 * inch, 3.6 * inch, 0.8 * inch, 0.9 * inch, 0.9 * inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ('TEXTCOLOR', (0, 0), (-1, 0), dark_color),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 10))

    # Totals Table + Paid Stamp
    totals_data = [
        ["Subtotal (Services, Labour & Parts):", f"₹{data['subtotal']:.2f}"],
        ["GST (18%):", f"₹{data['gst_amount']:.2f}"],
        ["Discount Applied:", f"-₹{data['discount']:.2f}"],
        ["Grand Total Paid:", f"₹{data['total_amount']:.2f}"]
    ]

    totals_table = Table(totals_data, colWidths=[2.2 * inch, 1.2 * inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, -1), (-1, -1), primary_color),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('LINEABOVE', (0, -1), (-1, -1), 1, primary_color),
    ]))

    stamp_text = Paragraph("<font color='#16A34A'><b>✔ STATUS: PAID IN FULL</b></font><br/><font size='8' color='#64748B'>Thank you for trusting VSCMS!</font>", body_style)

    summary_table = Table([
        [stamp_text, totals_table]
    ], colWidths=[3.8 * inch, 3.4 * inch])
    summary_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT')
    ]))
    elements.append(summary_table)

    # Work notes if any
    if data['work_performed']:
        elements.append(Spacer(1, 8))
        notes_str = "<br/>".join([f"• {note}" for note in data['work_performed']])
        elements.append(Paragraph(f"<b>Technician Work Notes:</b><br/>{notes_str}", subtitle_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer
