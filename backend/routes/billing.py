from flask import Blueprint, request, jsonify
from extensions import db, token_required, role_required
from models import Invoice, Service_Request
from services.billing_service import add_invoice_adjustment
from services.payment_gateway import record_manual_payment

billing_bp = Blueprint('billing', __name__, url_prefix='/api/invoices')

def verify_invoice_access(invoice, user):
    if user.Role == 'admin':
        return True
    if user.Role == 'customer' and invoice.request and invoice.request.Customer_ID == user.User_ID:
        return True
    return False

@billing_bp.route('', methods=['GET'])
@token_required
def list_invoices():
    user = request.current_user
    status = request.args.get('status')

    if user.Role == 'customer':
        query = Invoice.query.join(Service_Request).filter(Service_Request.Customer_ID == user.User_ID)
    else:
        query = Invoice.query

    if status:
        query = query.filter(Invoice.Status == status)

    invoices = query.order_by(Invoice.Created_At.desc()).all()
    return jsonify({"invoices": [inv.to_dict() for inv in invoices]}), 200

@billing_bp.route('/<int:invoice_id>', methods=['GET'])
@token_required
def get_invoice(invoice_id):
    user = request.current_user
    invoice = db.session.get(Invoice, invoice_id)
    if not invoice:
        return jsonify({"error": "Invoice not found", "code": "NOT_FOUND"}), 404

    if not verify_invoice_access(invoice, user):
        return jsonify({"error": "Forbidden: You cannot view this invoice", "code": "FORBIDDEN"}), 403

    return jsonify({"invoice": invoice.to_dict()}), 200

@billing_bp.route('/<int:invoice_id>/download', methods=['GET'])
@token_required
def download_invoice_data(invoice_id):
    user = request.current_user
    invoice = db.session.get(Invoice, invoice_id)
    if not invoice:
        return jsonify({"error": "Invoice not found", "code": "NOT_FOUND"}), 404

    if not verify_invoice_access(invoice, user):
        return jsonify({"error": "Forbidden: You cannot download this invoice", "code": "FORBIDDEN"}), 403

    invoice_data = invoice.to_dict()
    invoice_data["Company"] = {
        "Name": "VSCMS - Premium Vehicle Service Center",
        "GSTIN": "27AABCV1234F1Z8",
        "Address": "Plot 42, Auto Hub Way, Tech Industrial Park, Pune, MH, India",
        "Support_Phone": "+91 98765 43210",
        "Support_Email": "support@vscms.com"
    }
    return jsonify({"downloadable_invoice": invoice_data}), 200

@billing_bp.route('/<int:invoice_id>/adjustment', methods=['POST'])
@role_required('admin')
def create_adjustment(invoice_id):
    invoice = db.session.get(Invoice, invoice_id)
    if not invoice:
        return jsonify({"error": "Invoice not found", "code": "NOT_FOUND"}), 404

    data = request.get_json() or {}
    reason = data.get('reason', '').strip()
    amount = data.get('amount')

    if not reason or amount is None:
        return jsonify({"error": "Adjustment reason and amount are required", "code": "VALIDATION_ERROR"}), 400

    try:
        adjustment = add_invoice_adjustment(
            invoice_id=invoice.Invoice_ID,
            reason=reason,
            amount=float(amount),
            created_by_user_id=request.current_user.User_ID
        )
        return jsonify({
            "message": "Invoice adjustment applied successfully",
            "adjustment": adjustment.to_dict(),
            "invoice": invoice.to_dict()
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e), "code": "INVALID_ADJUSTMENT"}), 400

@billing_bp.route('/<int:invoice_id>/mark-paid', methods=['POST'])
@role_required('admin')
def mark_as_paid(invoice_id):
    invoice = db.session.get(Invoice, invoice_id)
    if not invoice:
        return jsonify({"error": "Invoice not found", "code": "NOT_FOUND"}), 404

    if invoice.Status == 'Paid':
        return jsonify({"error": "Invoice is already paid", "code": "ALREADY_PAID"}), 409

    data = request.get_json() or {}
    method = data.get('method', 'Cash')
    notes = data.get('notes', 'Admin manual payment receipt')

    payment = record_manual_payment(invoice.Invoice_ID, method, request.current_user.User_ID, notes)
    return jsonify({
        "message": f"Invoice #{invoice.Invoice_Number} marked as Paid via {method}",
        "invoice": invoice.to_dict(),
        "payment": payment.to_dict()
    }), 200

@billing_bp.route('/<int:invoice_id>', methods=['PUT', 'DELETE'])
@token_required
def modify_or_delete_invoice(invoice_id):
    invoice = db.session.get(Invoice, invoice_id)
    if not invoice:
        return jsonify({"error": "Invoice not found", "code": "NOT_FOUND"}), 404

    # Direct edits/deletions on invoices (especially paid ones) are strictly prohibited
    if invoice.Status == 'Paid':
        return jsonify({
            "error": "Paid invoices are immutable and cannot be edited or deleted. Adjustments must be recorded via Invoice Adjustments.",
            "code": "PAID_INVOICE_IMMUTABLE"
        }), 409

    return jsonify({
        "error": "Direct invoice modifications are disallowed. Invoices are generated automatically from completed work orders.",
        "code": "OPERATION_NOT_ALLOWED"
    }), 403
