import io
import csv
from datetime import datetime, date
from flask import Blueprint, request, jsonify, Response, abort
from extensions import db, role_required
from models import Invoice, Service_Request, Spare_Part, Job_Part_Used, Mechanic, Job_Labour, User, Vehicle
from services.tenancy import (
    get_current_center_id, scoped_invoices, scoped_requests,
    scoped_parts, scoped_mechanics
)

report_bp = Blueprint('report', __name__, url_prefix='/api/reports')

def parse_date(date_str, is_end=False):
    if not date_str:
        return None
    try:
        dt = datetime.strptime(date_str.strip(), "%Y-%m-%d")
        if is_end:
            return dt.replace(hour=23, minute=59, second=59)
        return dt.replace(hour=0, minute=0, second=0)
    except Exception:
        return None

def get_report_scope(user):
    """
    Returns (center_id, is_platform_wide).
    For center/mechanic/admin users, center_id is strictly resolved and cannot be None.
    For platform_admin, center_id is optional (from query params).
    """
    if user.Role == 'platform_admin':
        cid = request.args.get('center_id', type=int)
        return cid, (cid is None)
    
    cid = get_current_center_id(user)
    return cid, False


@report_bp.route('/revenue', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def revenue_report():
    user = getattr(request, 'current_user', None)
    center_id, is_platform_wide = get_report_scope(user)
    from_date = parse_date(request.args.get('from'))
    to_date = parse_date(request.args.get('to'), is_end=True)
    export_csv = request.args.get('export', '').lower() == 'csv'

    if is_platform_wide:
        query = Invoice.query.filter(Invoice.Status == 'Paid')
    else:
        query = scoped_invoices(center_id).filter(Invoice.Status == 'Paid')

    if from_date:
        query = query.filter(Invoice.Created_At >= from_date)
    if to_date:
        query = query.filter(Invoice.Created_At <= to_date)

    invoices = query.order_by(Invoice.Created_At.desc()).all()

    total_revenue = sum(inv.Total_Amount for inv in invoices)
    total_labour = sum(inv.Labour_Charge for inv in invoices)
    total_parts = sum(inv.Parts_Cost for inv in invoices)
    total_gst = sum(inv.GST_Amount for inv in invoices)
    total_discount = sum(inv.Discount for inv in invoices)

    if export_csv:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Invoice Number", "Date", "Customer", "Labour Charge", "Parts Cost", "GST Amount", "Discount", "Total Amount"])
        for inv in invoices:
            writer.writerow([
                inv.Invoice_Number,
                inv.Created_At.strftime("%Y-%m-%d %H:%M") if inv.Created_At else "",
                inv.request.customer.Name if inv.request and inv.request.customer else "",
                inv.Labour_Charge,
                inv.Parts_Cost,
                inv.GST_Amount,
                inv.Discount,
                inv.Total_Amount
            ])
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment;filename=revenue_report.csv"}
        )

    return jsonify({
        "summary": {
            "total_revenue": round(total_revenue, 2),
            "total_labour": round(total_labour, 2),
            "total_parts": round(total_parts, 2),
            "total_gst": round(total_gst, 2),
            "total_discount": round(total_discount, 2),
            "paid_invoice_count": len(invoices)
        },
        "invoices": [inv.to_dict() for inv in invoices]
    }), 200

@report_bp.route('/bookings', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def bookings_report():
    user = getattr(request, 'current_user', None)
    center_id, is_platform_wide = get_report_scope(user)
    from_date = parse_date(request.args.get('from'))
    to_date = parse_date(request.args.get('to'), is_end=True)
    export_csv = request.args.get('export', '').lower() == 'csv'

    if is_platform_wide:
        query = Service_Request.query
    else:
        query = scoped_requests(center_id)

    if from_date:
        query = query.filter(Service_Request.Created_At >= from_date)
    if to_date:
        query = query.filter(Service_Request.Created_At <= to_date)

    requests = query.order_by(Service_Request.Created_At.desc()).all()

    status_counts = {}
    urgency_counts = {}
    for r in requests:
        status_counts[r.Status] = status_counts.get(r.Status, 0) + 1
        urgency_counts[r.Urgency] = urgency_counts.get(r.Urgency, 0) + 1

    if export_csv:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Request ID", "Date", "Customer", "Vehicle", "Status", "Urgency", "Mechanic"])
        for r in requests:
            writer.writerow([
                f"#{r.Request_ID}",
                r.Created_At.strftime("%Y-%m-%d %H:%M") if r.Created_At else "",
                r.customer.Name if r.customer else "",
                r.vehicle.Registration_Number if r.vehicle else "",
                r.Status,
                r.Urgency,
                r.mechanic.user.Name if r.mechanic and r.mechanic.user else "Unassigned"
            ])
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment;filename=bookings_report.csv"}
        )

    return jsonify({
        "summary": {
            "total_bookings": len(requests),
            "by_status": status_counts,
            "by_urgency": urgency_counts
        },
        "bookings": [r.to_dict(full=False) for r in requests]
    }), 200

@report_bp.route('/inventory', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def inventory_report():
    user = getattr(request, 'current_user', None)
    center_id, is_platform_wide = get_report_scope(user)
    from_date = parse_date(request.args.get('from'))
    to_date = parse_date(request.args.get('to'), is_end=True)
    export_csv = request.args.get('export', '').lower() == 'csv'

    if is_platform_wide:
        query = Spare_Part.query.filter_by(is_active=True)
    else:
        query = scoped_parts(center_id).filter_by(is_active=True)

    parts = query.order_by(Spare_Part.Name.asc()).all()

    total_valuation = sum(p.Price * p.Quantity_In_Stock for p in parts)
    low_stock_parts = [p for p in parts if p.stock_status == 'Low stock']
    out_of_stock_parts = [p for p in parts if p.stock_status == 'Out of stock']
    low_stock_count = len(low_stock_parts)
    out_of_stock_count = len(out_of_stock_parts)

    # Most used parts in selected date range
    used_query = db.session.query(
        Spare_Part.Name.label('name'),
        Spare_Part.sku.label('sku'),
        Spare_Part.category.label('category'),
        Spare_Part.unit.label('unit'),
        db.func.sum(Job_Part_Used.Quantity).label('quantity')
    ).join(Spare_Part, Job_Part_Used.Part_ID == Spare_Part.Part_ID)\
     .join(Service_Request, Job_Part_Used.Request_ID == Service_Request.Request_ID)

    if not is_platform_wide:
        used_query = used_query.filter(Spare_Part.center_id == center_id)
    if from_date:
        used_query = used_query.filter(Service_Request.Created_At >= from_date)
    if to_date:
        used_query = used_query.filter(Service_Request.Created_At <= to_date)

    most_used_data = used_query.group_by(Spare_Part.Part_ID)\
        .order_by(db.func.sum(Job_Part_Used.Quantity).desc())\
        .limit(10).all()

    most_used = [
        {
            "name": row.name,
            "sku": row.sku or "",
            "category": row.category or "General",
            "unit": row.unit or "piece",
            "quantity": int(row.quantity or 0)
        }
        for row in most_used_data
    ]

    if export_csv:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["SKU", "Part Name", "Category", "Unit", "Unit Price (INR)", "Quantity In Stock", "Min Threshold", "Stock Value (INR)", "Status"])
        for p in parts:
            writer.writerow([
                p.sku or "N/A",
                p.Name,
                p.category or "General",
                p.unit or "piece",
                p.Price,
                p.Quantity_In_Stock,
                p.Min_Threshold,
                round(p.Price * p.Quantity_In_Stock, 2),
                p.stock_status
            ])
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment;filename=inventory_report.csv"}
        )

    return jsonify({
        "summary": {
            "total_parts_catalog": len(parts),
            "total_skus": len(parts),
            "total_valuation": round(total_valuation, 2),
            "total_asset_value": round(total_valuation, 2),
            "low_stock_items": low_stock_count + out_of_stock_count,
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count
        },
        "low_stock_parts": [p.to_dict() for p in low_stock_parts],
        "out_of_stock_parts": [p.to_dict() for p in out_of_stock_parts],
        "most_used": most_used,
        "parts": [p.to_dict() for p in parts]
    }), 200

@report_bp.route('/mechanic-performance', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def mechanic_performance_report():
    user = getattr(request, 'current_user', None)
    center_id, is_platform_wide = get_report_scope(user)
    export_csv = request.args.get('export', '').lower() == 'csv'

    if is_platform_wide:
        query = Mechanic.query
    else:
        query = scoped_mechanics(center_id)
    mechanics = query.all()

    perf_list = []
    for m in mechanics:
        m_req_query = Service_Request.query.filter_by(Mechanic_ID=m.Mechanic_ID)
        if not is_platform_wide:
            m_req_query = m_req_query.filter(Service_Request.center_id == center_id)
        assigned = m_req_query.all()
        total_assigned = len(assigned)
        completed = sum(1 for r in assigned if r.Status == 'Completed')
        in_progress = sum(1 for r in assigned if r.Status in ['Assigned', 'In Progress', 'Awaiting Parts'])

        req_ids = [r.Request_ID for r in assigned]
        labour_entries = Job_Labour.query.filter(Job_Labour.Request_ID.in_(req_ids)).all() if req_ids else []
        total_hours = sum(l.Hours for l in labour_entries)
        total_labour_rev = sum(l.Hours * l.Rate_Per_Hour for l in labour_entries)

        perf_list.append({
            "mechanic_id": m.Mechanic_ID,
            "name": m.user.Name if m.user else "Unknown",
            "email": m.user.Email if m.user else "",
            "specialization": m.Specialization,
            "is_active": m.user.Is_Active if m.user else False,
            "is_available": m.Is_Available,
            "total_jobs": total_assigned,
            "completed_jobs": completed,
            "active_jobs": in_progress,
            "total_hours_logged": round(total_hours, 1),
            "total_labour_revenue": round(total_labour_rev, 2)
        })

    if export_csv:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Mechanic Name", "Specialization", "Total Jobs", "Completed", "Active", "Hours Logged", "Labour Revenue"])
        for p in perf_list:
            writer.writerow([
                p["name"],
                p["specialization"],
                p["total_jobs"],
                p["completed_jobs"],
                p["active_jobs"],
                p["total_hours_logged"],
                p["total_labour_revenue"]
            ])
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment;filename=mechanic_performance.csv"}
        )

    return jsonify({"mechanics": perf_list}), 200

@report_bp.route('/customers', methods=['GET'])
@report_bp.route('/customer-performance', methods=['GET'])
@role_required('admin', 'center', 'platform_admin')
def customer_performance_report():
    """
    Returns performance & activity report for customers who have booked at this center.
    STRICT DATA ISOLATION:
    Only customers who have scheduled an appointment at this service center are returned.
    Never exposes customers or data from other service centers.
    """
    user = getattr(request, 'current_user', None)
    center_id, is_platform_wide = get_report_scope(user)
    from_date = parse_date(request.args.get('from'))
    to_date = parse_date(request.args.get('to'), is_end=True)
    export_csv = request.args.get('export', '').lower() == 'csv'

    if is_platform_wide:
        req_query = Service_Request.query
    else:
        req_query = scoped_requests(center_id)

    if from_date:
        req_query = req_query.filter(Service_Request.Created_At >= from_date)
    if to_date:
        req_query = req_query.filter(Service_Request.Created_At <= to_date)

    scoped_center_requests = req_query.all()
    customer_ids = list(set(r.Customer_ID for r in scoped_center_requests if r.Customer_ID))

    customers = User.query.filter(User.User_ID.in_(customer_ids)).all() if customer_ids else []

    cust_list = []
    for c in customers:
        # Requests made by this customer at THIS center (within reporting window)
        c_reqs = [r for r in scoped_center_requests if r.Customer_ID == c.User_ID]

        # Total lifetime appointments by this customer at THIS center
        if is_platform_wide:
            total_center_appointments = Service_Request.query.filter_by(Customer_ID=c.User_ID).count()
        else:
            total_center_appointments = Service_Request.query.filter_by(Customer_ID=c.User_ID, center_id=center_id).count()

        completed_count = sum(1 for r in c_reqs if r.Status == 'Completed')
        active_count = sum(1 for r in c_reqs if r.Status in ['Assigned', 'In Progress', 'Awaiting Parts', 'Pending Approval', 'Pending', 'Accepted'])

        # Unique vehicles booked by this customer at THIS center
        c_veh_ids = list(set(r.Vehicle_ID for r in c_reqs if r.Vehicle_ID))
        c_vehicles = Vehicle.query.filter(Vehicle.Vehicle_ID.in_(c_veh_ids)).all() if c_veh_ids else []

        # Paid invoices and revenue realized from this customer at THIS center
        inv_query = Invoice.query.join(Service_Request, Invoice.Request_ID == Service_Request.Request_ID).filter(
            Service_Request.Customer_ID == c.User_ID,
            Invoice.Status == 'Paid'
        )
        if not is_platform_wide:
            inv_query = inv_query.filter(Invoice.center_id == center_id)
        if from_date:
            inv_query = inv_query.filter(Invoice.Created_At >= from_date)
        if to_date:
            inv_query = inv_query.filter(Invoice.Created_At <= to_date)
        paid_invoices = inv_query.all()
        total_spent = sum(inv.Total_Amount for inv in paid_invoices)

        sorted_c_reqs = sorted(c_reqs, key=lambda r: r.Created_At or datetime.min, reverse=True)
        last_appointment = sorted_c_reqs[0].Created_At.strftime("%Y-%m-%d %H:%M") if (sorted_c_reqs and sorted_c_reqs[0].Created_At) else None

        cust_list.append({
            "customer_id": c.User_ID,
            "name": c.Name or "Unknown Customer",
            "email": c.Email or "",
            "contact": c.Contact or "",
            "address": c.Address or "",
            "is_active": c.Is_Active if hasattr(c, 'Is_Active') else True,
            "appointments_in_period": len(c_reqs),
            "total_appointments": total_center_appointments,
            "completed_jobs": completed_count,
            "active_jobs": active_count,
            "total_spent": round(total_spent, 2),
            "vehicles": [v.to_dict() for v in c_vehicles],
            "vehicle_count": len(c_vehicles),
            "last_appointment_date": last_appointment,
            "recent_appointments": [
                {
                    "request_id": r.Request_ID,
                    "date": r.Created_At.strftime("%Y-%m-%d %H:%M") if r.Created_At else "",
                    "slot_time": f"{r.slot.Date} {r.slot.Start_Time}-{r.slot.End_Time}" if r.slot else "N/A",
                    "status": r.Status,
                    "urgency": r.Urgency,
                    "problem": r.Problem_Description or "Standard Maintenance",
                    "vehicle": f"{r.vehicle.Make} {r.vehicle.Model} ({r.vehicle.Registration_Number})" if r.vehicle else "",
                    "mechanic": r.mechanic.user.Name if (r.mechanic and r.mechanic.user) else "Unassigned",
                    "invoice_total": r.invoice.Total_Amount if r.invoice else None,
                    "invoice_status": r.invoice.Status if r.invoice else None
                }
                for r in sorted_c_reqs[:5]
            ]
        })

    cust_list.sort(key=lambda x: (x["appointments_in_period"], x["total_spent"]), reverse=True)

    if export_csv:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Customer Name", "Contact", "Email", "Vehicles Serviced", "Appointments In Period", "Lifetime Workshop Appointments", "Completed Jobs", "Total Revenue (INR)", "Last Appointment Date"])
        for cust in cust_list:
            v_names = "; ".join([f"{v.get('Make', '')} {v.get('Model', '')} ({v.get('Registration_Number', '')})" for v in cust["vehicles"]])
            writer.writerow([
                cust["name"],
                cust["contact"],
                cust["email"],
                v_names,
                cust["appointments_in_period"],
                cust["total_appointments"],
                cust["completed_jobs"],
                cust["total_spent"],
                cust["last_appointment_date"] or "N/A"
            ])
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment;filename=customer_performance_report.csv"}
        )

    return jsonify({
        "summary": {
            "total_customers": len(cust_list),
            "repeat_customers": sum(1 for c in cust_list if c["total_appointments"] > 1),
            "total_appointments": len(scoped_center_requests),
            "total_revenue": round(sum(c["total_spent"] for c in cust_list), 2)
        },
        "customers": cust_list
    }), 200

