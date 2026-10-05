import csv
import io
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta

from flask import Blueprint, Response, jsonify, request

from models import (Invoice, JobLabour, JobPartUsed, Mechanic, Payment, ServiceRequest, SparePart, TimeSlot)
from utils import parse_date, role_required, validation_error

bp = Blueprint("reports", __name__, url_prefix="/api/reports")


def _range():
    to = parse_date(request.args.get("to"), "to", required=False) or date.today()
    frm = parse_date(request.args.get("from"), "from", required=False) or (to - timedelta(days=29))
    if frm > to:
        raise validation_error("'from' must not be after 'to'", "from")
    start = datetime.combine(frm, datetime.min.time())
    end = datetime.combine(to + timedelta(days=1), datetime.min.time())
    return frm, to, start, end


def _respond(title, frm, to, columns, rows, summary, charts):
    if request.args.get("format") == "csv":
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(columns)
        w.writerows(rows)
        return Response(buf.getvalue(), mimetype="text/csv", headers={
            "Content-Disposition": f'attachment; filename="{title.lower().replace(" ", "-")}-{frm}_{to}.csv"'})
    return jsonify({"title": title, "from": frm.isoformat(), "to": to.isoformat(), "columns": columns,
                    "rows": rows, "summary": summary, "charts": charts})


def _daily(frm, to, counter):
    out, d = [], frm
    while d <= to:
        out.append({"date": d.isoformat(), "value": round(counter.get(d.isoformat(), 0), 2)})
        d += timedelta(days=1)
    return out


@bp.get("/revenue")
@role_required("admin")
def revenue():
    frm, to, start, end = _range()
    pays = (Payment.query.filter(Payment.status == "Success", Payment.created_at >= start,
                                 Payment.created_at < end).order_by(Payment.created_at).all())
    by_day, by_method = defaultdict(float), defaultdict(float)
    rows = []
    for p in pays:
        inv = p.invoice
        by_day[p.created_at.date().isoformat()] += p.amount
        by_method[p.method] += p.amount
        rows.append([p.created_at.strftime("%Y-%m-%d %H:%M"), inv.invoice_number, inv.request.customer.name,
                     p.method, p.transaction_id, round(p.amount, 2)])
    total = round(sum(p.amount for p in pays), 2)
    unpaid = Invoice.query.filter(Invoice.status == "Unpaid", Invoice.created_at >= start,
                                  Invoice.created_at < end).all()
    summary = {"total_revenue": total, "payments": len(pays),
               "average_payment": round(total / len(pays), 2) if pays else 0,
               "outstanding": round(sum(i.payable_total for i in unpaid), 2)}
    charts = {"daily": _daily(frm, to, by_day),
              "by_method": [{"name": k, "value": round(v, 2)} for k, v in by_method.items()]}
    return _respond("Revenue Report", frm, to,
                    ["Date", "Invoice", "Customer", "Method", "Transaction ID", "Amount (INR)"], rows, summary, charts)


@bp.get("/bookings")
@role_required("admin")
def bookings():
    frm, to, _, _ = _range()
    reqs = (ServiceRequest.query.join(TimeSlot, ServiceRequest.slot_id == TimeSlot.id)
            .filter(TimeSlot.date >= frm, TimeSlot.date <= to).order_by(TimeSlot.date, TimeSlot.start_time).all())
    by_status, by_day, by_service = Counter(), Counter(), Counter()
    rows = []
    for r in reqs:
        by_status[r.status] += 1
        by_day[r.slot.date.isoformat()] += 1
        names = [i.service.name for i in r.items]
        by_service.update(names)
        rows.append([r.id, r.slot.date.isoformat(), r.slot.start_time.strftime("%H:%M"), r.customer.name,
                     r.vehicle.registration_number, "; ".join(names), r.status,
                     r.mechanic.user.name if r.mechanic else ""])
    summary = {"total_bookings": len(reqs), **{k: v for k, v in by_status.items()}}
    charts = {"by_status": [{"name": k, "value": v} for k, v in by_status.items()],
              "daily": _daily(frm, to, by_day),
              "by_service": [{"name": k, "value": v} for k, v in by_service.most_common(10)]}
    return _respond("Bookings Report", frm, to,
                    ["Request", "Date", "Time", "Customer", "Vehicle", "Services", "Status", "Mechanic"],
                    rows, summary, charts)


@bp.get("/inventory")
@role_required("admin")
def inventory():
    frm, to, start, end = _range()
    used = defaultdict(int)
    q = (JobPartUsed.query.join(ServiceRequest, JobPartUsed.request_id == ServiceRequest.id)
         .filter(ServiceRequest.created_at >= start, ServiceRequest.created_at < end))
    for u in q.all():
        used[u.part_id] += u.quantity
    parts = SparePart.query.order_by(SparePart.name).all()
    rows = [[p.name, round(p.price, 2), p.quantity_in_stock, p.min_threshold,
             "LOW" if p.quantity_in_stock < p.min_threshold else "OK", used.get(p.id, 0)] for p in parts]
    summary = {"total_parts": len(parts), "low_stock_items": sum(1 for p in parts if p.quantity_in_stock < p.min_threshold),
               "stock_value": round(sum(p.price * p.quantity_in_stock for p in parts), 2),
               "units_used": sum(used.values())}
    charts = {"stock": [{"name": p.name, "stock": p.quantity_in_stock, "threshold": p.min_threshold} for p in parts],
              "usage": [{"name": p.name, "value": used[p.id]} for p in parts if used.get(p.id)]}
    return _respond("Inventory Report", frm, to,
                    ["Part", "Price (INR)", "In stock", "Min threshold", "Status", "Units used in range"],
                    rows, summary, charts)


@bp.get("/mechanic-performance")
@role_required("admin")
def mechanic_performance():
    frm, to, start, end = _range()
    rows = []
    for m in Mechanic.query.all():
        done = (ServiceRequest.query.filter(ServiceRequest.mechanic_id == m.id, ServiceRequest.status == "Completed",
                                            ServiceRequest.completed_at >= start, ServiceRequest.completed_at < end).all())
        hours = sum(l.hours for r in done for l in r.labour)
        revenue = sum(r.invoice.labour_charge for r in done if r.invoice)
        active = ServiceRequest.query.filter(ServiceRequest.mechanic_id == m.id,
                                             ServiceRequest.status.in_(("Assigned", "In Progress", "Awaiting Parts"))).count()
        rows.append([m.user.name, m.specialization or "", len(done), round(hours, 1),
                     round(hours / len(done), 2) if done else 0, round(revenue, 2), active])
    summary = {"mechanics": len(rows), "jobs_completed": sum(r[2] for r in rows),
               "labour_hours": round(sum(r[3] for r in rows), 1)}
    charts = {"jobs": [{"name": r[0], "value": r[2]} for r in rows],
              "hours": [{"name": r[0], "value": r[3]} for r in rows]}
    return _respond("Mechanic Performance", frm, to,
                    ["Mechanic", "Specialization", "Jobs completed", "Labour hours", "Avg hours / job",
                     "Labour revenue (INR)", "Active jobs"], rows, summary, charts)
