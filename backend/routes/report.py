import io
import csv
from datetime import datetime
from flask import Blueprint, request, jsonify, Response
from extensions import db, role_required
from models import Invoice, Service_Request, Spare_Part, Mechanic, Job_Labour, User

report_bp = Blueprint('report', __name__, url_prefix='/api/reports')

def parse_date(date_str, is_end=False):
    if not date_str:
        return None
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        if is_end:
            return dt.replace(hour=23, minute=59, second=59)
        return dt.replace(hour=0, minute=0, second=0)
    except Exception:
        return None

@report_bp.route('/revenue', methods=['GET'])
@role_required('admin')
def revenue_report():
    from_date = parse_date(request.args.get('from'))
    to_date = parse_date(request.args.get('to'), is_end=True)
    export_csv = request.args.get('export', '').lower() == 'csv'

    query = Invoice.query.filter(Invoice.Status == 'Paid')
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
@role_required('admin')
def bookings_report():
    from_date = parse_date(request.args.get('from'))
    to_date = parse_date(request.args.get('to'), is_end=True)
    export_csv = request.args.get('export', '').lower() == 'csv'

    query = Service_Request.query
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
@role_required('admin')
def inventory_report():
    export_csv = request.args.get('export', '').lower() == 'csv'
    parts = Spare_Part.query.order_by(Spare_Part.Name.asc()).all()

    total_valuation = sum(p.Price * p.Quantity_In_Stock for p in parts)
    low_stock_count = sum(1 for p in parts if p.Quantity_In_Stock <= p.Min_Threshold)

    if export_csv:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Part ID", "Name", "Unit Price", "Stock Quantity", "Min Threshold", "Status"])
        for p in parts:
            status = "Low Stock" if p.Quantity_In_Stock <= p.Min_Threshold else "Adequate"
            writer.writerow([p.Part_ID, p.Name, p.Price, p.Quantity_In_Stock, p.Min_Threshold, status])
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment;filename=inventory_report.csv"}
        )

    return jsonify({
        "summary": {
            "total_parts_catalog": len(parts),
            "total_valuation": round(total_valuation, 2),
            "low_stock_items": low_stock_count
        },
        "parts": [p.to_dict() for p in parts]
    }), 200

@report_bp.route('/mechanic-performance', methods=['GET'])
@role_required('admin')
def mechanic_performance_report():
    export_csv = request.args.get('export', '').lower() == 'csv'
    mechanics = Mechanic.query.all()

    perf_list = []
    for m in mechanics:
        assigned = Service_Request.query.filter_by(Mechanic_ID=m.Mechanic_ID).all()
        total_assigned = len(assigned)
        completed = sum(1 for r in assigned if r.Status == 'Completed')
        in_progress = sum(1 for r in assigned if r.Status in ['Assigned', 'In Progress', 'Awaiting Parts'])

        # Total hours and labour revenue
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
