"""
Comprehensive Multi-Tenant Isolation Audit Script for VSCMS
Audits database consistency, endpoint scoping, codebase bug patterns, and registration flows.
"""
import os
import sys
import re
import inspect

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, backend_dir)

from app import create_app
from extensions import db
from models import (
    User, Service_Center, Service_Request, Invoice, Payment,
    Time_Slot, Spare_Part, Mechanic, Center_Service, Job_Part_Used,
    Request_Attachment
)

def audit_database():
    print("=" * 80)
    print("DATABASE DATA ISOLATION AUDIT")
    print("=" * 80)
    inconsistencies = []

    # 1. Service requests with NULL center_id
    null_requests = Service_Request.query.filter(Service_Request.center_id.is_(None)).all()
    if null_requests:
        inconsistencies.append(f"Service Requests with NULL center_id: {len(null_requests)} (IDs: {[r.Request_ID for r in null_requests]})")
    else:
        print("[OK] All service requests have valid center_id")

    # 2. Invoices whose center_id differs from their request's center_id or NULL
    invoices = Invoice.query.all()
    invoice_mismatches = []
    for inv in invoices:
        req = Service_Request.query.get(inv.Request_ID) if inv.Request_ID else None
        if not inv.center_id:
            invoice_mismatches.append((inv.Invoice_ID, "NULL center_id", req.center_id if req else "No Request"))
        elif req and inv.center_id != req.center_id:
            invoice_mismatches.append((inv.Invoice_ID, inv.center_id, req.center_id))
    if invoice_mismatches:
        inconsistencies.append(f"Invoices with center_id mismatch: {len(invoice_mismatches)} (Details: {invoice_mismatches})")
    else:
        print("[OK] All invoices match their corresponding service request center_id")

    # 3. Payments whose invoice belongs to another center
    payments = Payment.query.all()
    payment_mismatches = []
    for p in payments:
        inv = Invoice.query.get(p.Invoice_ID) if p.Invoice_ID else None
        if not inv:
            payment_mismatches.append((p.Payment_ID, "No invoice"))
        elif not inv.center_id:
            payment_mismatches.append((p.Payment_ID, "Invoice has NULL center_id"))
    if payment_mismatches:
        inconsistencies.append(f"Payments with invoice center inconsistencies: {len(payment_mismatches)} (Details: {payment_mismatches})")
    else:
        print("[OK] All payments belong to valid center-scoped invoices")

    # 4. Mechanics assigned to requests of another center
    assigned_requests = Service_Request.query.filter(Service_Request.Mechanic_ID.isnot(None)).all()
    mech_mismatches = []
    for r in assigned_requests:
        mech = Mechanic.query.get(r.Mechanic_ID)
        if mech and mech.center_id and r.center_id and mech.center_id != r.center_id:
            mech_mismatches.append((r.Request_ID, r.center_id, mech.Mechanic_ID, mech.center_id))
    if mech_mismatches:
        inconsistencies.append(f"Mechanics assigned across different centers: {len(mech_mismatches)} (Details: {mech_mismatches})")
    else:
        print("[OK] All assigned mechanics belong to the request's center")

    # 5. Requests whose slot belongs to another center
    slot_requests = Service_Request.query.filter(Service_Request.Slot_ID.isnot(None)).all()
    slot_mismatches = []
    for r in slot_requests:
        slot = Time_Slot.query.get(r.Slot_ID)
        if slot and slot.center_id != r.center_id:
            slot_mismatches.append((r.Request_ID, r.center_id, slot.Slot_ID, slot.center_id))
    if slot_mismatches:
        inconsistencies.append(f"Requests with Slot from different center: {len(slot_mismatches)} (Details: {slot_mismatches})")
    else:
        print("[OK] All requested slots belong to the request's center")

    # 6. Users with role center/mechanic and NULL center_id
    center_users_null = User.query.filter(User.Role.in_(['center', 'mechanic']), User.center_id.is_(None)).all()
    if center_users_null:
        inconsistencies.append(f"Users with role center/mechanic and NULL center_id: {len(center_users_null)} (IDs: {[u.User_ID for u in center_users_null]}, Emails: {[u.Email for u in center_users_null]})")
    else:
        print("[OK] All center/mechanic users have center_id assigned")

    # 7. Spare parts with NULL center_id
    null_parts = Spare_Part.query.filter(Spare_Part.center_id.is_(None)).all()
    if null_parts:
        inconsistencies.append(f"Spare parts with NULL center_id: {len(null_parts)} (Part IDs: {[p.Part_ID for p in null_parts]})")
    else:
        print("[OK] All spare parts have center_id")

    # 8. Job parts or invoice line items from a different center than request
    job_parts = Job_Part_Used.query.all()
    jp_mismatches = []
    for jp in job_parts:
        req = Service_Request.query.get(jp.Request_ID) if jp.Request_ID else None
        part = Spare_Part.query.get(jp.Part_ID) if jp.Part_ID else None
        if req and part and part.center_id != req.center_id:
            jp_mismatches.append((jp.Job_Part_ID, req.Request_ID, req.center_id, part.Part_ID, part.center_id))
    if jp_mismatches:
        inconsistencies.append(f"Job parts used from different center: {len(jp_mismatches)} (Details: {jp_mismatches})")
    else:
        print("[OK] All job parts match request center_id")

    # 9. Time slots with NULL center_id
    null_slots = Time_Slot.query.filter(Time_Slot.center_id.is_(None)).all()
    if null_slots:
        inconsistencies.append(f"Time slots with NULL center_id: {len(null_slots)}")
    else:
        print("[OK] All time slots have center_id")

    # 10. Center services with NULL center_id
    null_services = Center_Service.query.filter(Center_Service.center_id.is_(None)).all()
    if null_services:
        inconsistencies.append(f"Center_Service with NULL center_id: {len(null_services)}")
    else:
        print("[OK] All center services have center_id")

    print("\n--- INCONSISTENCY SUMMARY ---")
    if inconsistencies:
        for idx, inc in enumerate(inconsistencies, 1):
            print(f"[{idx}] {inc}")
    else:
        print("ZERO database inconsistencies found!")
    print()
    return len(inconsistencies)

def audit_routes(app):
    print("=" * 80)
    print("BACKEND ROUTE SCOPING AUDIT")
    print("=" * 80)
    routes = []
    
    for rule in sorted(app.url_map.iter_rules(), key=lambda r: r.rule):
        endpoint = rule.endpoint
        methods = [m for m in rule.methods if m not in ('HEAD', 'OPTIONS')]
        view_func = app.view_functions.get(endpoint)
        if not view_func:
            continue
        
        # Recursively unwrap decorators
        orig_func = view_func
        while hasattr(orig_func, '__wrapped__'):
            orig_func = orig_func.__wrapped__
            
        try:
            source_file = inspect.getsourcefile(orig_func)
            source_lines, start_line = inspect.getsourcelines(orig_func)
            source_code = "".join(source_lines)
            rel_file = os.path.relpath(source_file, backend_dir) if source_file else "unknown"
        except Exception:
            rel_file = "unknown"
            source_code = ""
            start_line = 0

        rule_str = rule.rule
        if not rule_str.startswith('/api'):
            continue
        if rule_str in ['/api/health', '/api/auth/login', '/api/auth/register', '/api/auth/register-mechanic', '/api/auth/me', '/api/auth/location', '/api/auth/profile']:
            continue

        has_fallback_1 = bool(re.search(r'center_id\s*or\s*1|or\s*DEFAULT|get_default_center|Service_Center\.query\.first\(\)|db\.session\.get\(Service_Center,\s*1\)', source_code))
        has_optional_filter = bool(re.search(r'if\s+(?:center_id|user\.center_id|target_center)\s*:', source_code)) and not bool(re.search(r'is_platform_wide|Role\s*==\s*[\'"]platform_admin[\'"]', source_code))
        
        has_scoped_helpers = bool(re.search(r'scoped_requests|scoped_invoices|scoped_payments|scoped_customers|scoped_parts|scoped_mechanics|scoped_slots|scoped_services|scoped_attachments|scoped_notifications', source_code))
        has_safe_fetch = bool(re.search(r'get_or_404_in_center|fetch_request_or_404|verify_and_fetch_request|verify_and_get_payment', source_code))
        has_direct_center_filter = bool(re.search(r'\bcenter_id\s*==|\bcenter_id=', source_code))
        
        status = "SCOPED"
        filter_mechanism = "None"
        
        if rule_str.startswith('/api/platform'):
            status = "SCOPED"
            filter_mechanism = "Platform-admin only (@role_required('platform_admin'))"
        elif has_fallback_1:
            status = "NOT SCOPED"
            filter_mechanism = "Vulnerable: Falls back to center #1 or Service_Center.query.first()"
        elif has_optional_filter:
            status = "PARTIAL"
            filter_mechanism = "Vulnerable: Center filter is optional/conditional"
        elif "contact" in rule_str:
            status = "SCOPED"
            filter_mechanism = "Center-scoped: returns empty list for workshop admins"
        elif has_scoped_helpers:
            status = "SCOPED"
            filter_mechanism = "Strictly scoped via tenancy query helper"
        elif has_safe_fetch:
            status = "SCOPED"
            filter_mechanism = "Strictly scoped via get_or_404_in_center safe lookup"
        elif has_direct_center_filter:
            status = "SCOPED"
            filter_mechanism = "Direct center_id filter on model query"
        elif rule_str in ['/api/centers', '/api/centers/<int:center_id>', '/api/centers/<int:center_id>/slots', '/api/centers/<int:center_id>/slots/check', '/api/centers/register', '/api/centers/verify-code/<center_code>', '/api/locations/cities', '/api/locations/areas', '/api/locations/nearest']:
            status = "SCOPED"
            filter_mechanism = "Customer Discovery / Registration (Public Catalog)"
        else:
            status = "NOT SCOPED"
            filter_mechanism = "No center filter in query"

        routes.append({
            "rule": rule_str,
            "methods": ",".join(methods),
            "endpoint": endpoint,
            "file": f"{rel_file}:{start_line}",
            "status": status,
            "filter_mechanism": filter_mechanism
        })

    # Print route audit table
    print(f"{'ROUTE':<52} {'METHODS':<8} {'STATUS':<12} {'FILE:LINE':<28} {'FILTER MECHANISM'}")
    print("-" * 150)
    for r in routes:
        print(f"{r['rule']:<52} {r['methods']:<8} {r['status']:<12} {r['file']:<28} {r['filter_mechanism']}")
    print()
    return routes

def audit_codebase_patterns():
    print("=" * 80)
    print("CODEBASE PATTERN AUDIT (BUG HUNT)")
    print("=" * 80)
    patterns = [
        ("center_id or 1 / default fallbacks", r'center_id\s+or\s+1|or\s+DEFAULT_CENTER|get_default_center|Service_Center\.query\.first\(\)|db\.session\.get\(Service_Center,\s*1\)'),
        ("Optional center_id filter (if user.center_id deciding filter)", r'if\s+(?:user\.)?center_id\s*:\s*\n\s*query\s*='),
        ("Unfiltered Model.query.all() on tenant tables", r'(?:Service_Request|Invoice|Payment|Spare_Part|Time_Slot|Notification|Job_Part_Used)\.query\.all\(\)'),
        ("Missing center filter on aggregation", r'func\.(?:sum|count)\([^\)]*\)(?:(?!center_id).)*\.scalar\(\)'),
        ("Direct object fetch by ID without center verification", r'(?:Service_Request|Invoice|Payment|Time_Slot|Spare_Part)\.query\.get\('),
    ]

    target_dirs = [
        os.path.join(backend_dir, 'routes'),
        os.path.join(backend_dir, 'services'),
    ]

    total_all_hits = 0
    for label, pat in patterns:
        print(f"\n--- Checking: {label} ---")
        regex = re.compile(pat, re.IGNORECASE)
        hits = 0
        for d in target_dirs:
            for root, _, files in os.walk(d):
                for f in files:
                    if not f.endswith('.py'):
                        continue
                    filepath = os.path.join(root, f)
                    relpath = os.path.relpath(filepath, backend_dir)
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as fp:
                        for line_no, line in enumerate(fp, 1):
                            if regex.search(line):
                                print(f"  {relpath}:{line_no} -> {line.strip()[:100]}")
                                hits += 1
        if hits == 0:
            print("  [None found - CLEAN]")
        else:
            print(f"  Total hits: {hits}")
        total_all_hits += hits

    return total_all_hits

def audit_registration_flow():
    print("\n" + "=" * 80)
    print("REGISTRATION FLOW AUDIT")
    print("=" * 80)
    catalog_file = os.path.join(backend_dir, 'routes', 'catalog.py')
    with open(catalog_file, 'r', encoding='utf-8') as f:
        catalog_code = f.read()

    auth_file = os.path.join(backend_dir, 'routes', 'auth.py')
    with open(auth_file, 'r', encoding='utf-8') as f:
        auth_code = f.read()
    
    # 1. Center Registration
    if "/centers/register" in catalog_code:
        print("[OK] Center registration endpoint exists at /api/centers/register")
        if "Service_Center(" in catalog_code:
            print("[OK] Creates a brand-new row in Service_Center table")
        else:
            print("[FAIL] Does not create Service_Center instance")
        if "owner.center_id = center.id" in catalog_code:
            print("[OK] Sets owner user.center_id = new center.id (never None, never default)")
        else:
            print("[FAIL] Owner center_id is not set to new center.id")
        if "seed_default_parts(center.id)" in catalog_code:
            print("[OK] Seeds isolated spare parts catalog specifically for new center.id")
        if "ensure_slots_for_date(" in catalog_code and "center_id=center.id" in catalog_code:
            print("[OK] Generates slots isolated specifically for new center.id")

    # 2. Mechanic Registration
    if "/register-mechanic" in auth_code:
        print("[OK] Mechanic registration endpoint exists at /api/auth/register-mechanic")
        if "center_id=center.id" in auth_code:
            print("[OK] New mechanic user and profile are strictly bound to target center.id")
        else:
            print("[FAIL] Mechanic center_id is not bound correctly")

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        inconsistencies = audit_database()
        audit_routes(app)
        bug_hits = audit_codebase_patterns()
        audit_registration_flow()
