from flask import Blueprint, request, jsonify, send_file
from extensions import db, token_required, role_required
from models import Invoice, Payment, Service_Request
from services.payment_gateway import process_payment
from services.receipt_service import build_receipt_dict, generate_receipt_pdf
from services.tenancy import get_current_center_id, scoped_payments, get_or_404_in_center

payment_bp = Blueprint('payment', __name__, url_prefix='/api')

def verify_and_get_payment(payment_id, user):
    """
    Returns payment if accessible by user, otherwise raises 404 (or 403).
    """
    if user.Role == 'platform_admin':
        p = db.session.get(Payment, payment_id)
        if not p:
            return None
        return p
    if user.Role in ['admin', 'center', 'mechanic']:
        return get_or_404_in_center(Payment, payment_id)
    if user.Role == 'customer':
        p = db.session.get(Payment, payment_id)
        if not p or not p.invoice or not p.invoice.request or p.invoice.request.Customer_ID != user.User_ID:
            return None
        return p
    return None

@payment_bp.route('/payments/initiate', methods=['POST'])
@token_required
def initiate_payment():
    data = request.get_json() or {}
    invoice_id = data.get('invoice_id')
    if not invoice_id:
        return jsonify({"error": "Invoice ID is required", "code": "VALIDATION_ERROR"}), 400

    invoice = db.session.get(Invoice, invoice_id)
    if not invoice:
        return jsonify({"error": "Invoice not found", "code": "NOT_FOUND"}), 404

    # Authorization: Customer must own invoice, or center owner of this invoice
    user = request.current_user
    if user.Role == 'customer':
        if not invoice.request or invoice.request.Customer_ID != user.User_ID:
            return jsonify({"error": "Invoice not found", "code": "NOT_FOUND"}), 404
    elif user.Role in ['admin', 'center']:
        center_id = get_current_center_id(user)
        if invoice.center_id != center_id:
            return jsonify({"error": "Invoice not found", "code": "NOT_FOUND"}), 404

    if invoice.Status == 'Paid':
        return jsonify({"error": "Invoice is already paid", "code": "ALREADY_PAID"}), 409

    return jsonify({
        "status": "Initiated",
        "invoice_id": invoice.Invoice_ID,
        "invoice_number": invoice.Invoice_Number,
        "amount": invoice.Total_Amount,
        "methods": ["UPI", "Card", "NetBanking", "Pay at center"],
        "message": "Payment session initialized"
    }), 200

@payment_bp.route('/payments/process', methods=['POST'])
@token_required
def process_payment_route():
    data = request.get_json() or {}
    invoice_id = data.get('invoice_id')
    method = data.get('method', 'UPI')
    details = data.get('details', {})

    if not invoice_id:
        return jsonify({"error": "Invoice ID is required", "code": "VALIDATION_ERROR"}), 400

    invoice = db.session.get(Invoice, invoice_id)
    if not invoice:
        return jsonify({"error": "Invoice not found", "code": "NOT_FOUND"}), 404

    user = request.current_user
    if user.Role == 'customer':
        if not invoice.request or invoice.request.Customer_ID != user.User_ID:
            return jsonify({"error": "Invoice not found", "code": "NOT_FOUND"}), 404
    elif user.Role in ['admin', 'center']:
        center_id = get_current_center_id(user)
        if invoice.center_id != center_id:
            return jsonify({"error": "Invoice not found", "code": "NOT_FOUND"}), 404

    try:
        result = process_payment(invoice_id, method, details)
        if not result["success"]:
            return jsonify({
                "error": result["message"],
                "code": "PAYMENT_FAILED",
                "payment": result["payment"]
            }), 400

        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": str(e), "code": "PAYMENT_INVALID"}), 409
    except LookupError as e:
        return jsonify({"error": str(e), "code": "NOT_FOUND"}), 404

@payment_bp.route('/payments/cancel', methods=['POST'])
@token_required
def cancel_payment():
    data = request.get_json() or {}
    invoice_id = data.get('invoice_id')
    
    return jsonify({
        "status": "Cancelled",
        "invoice_id": invoice_id,
        "message": "Payment cancelled. Invoice remains Unpaid."
    }), 200

@payment_bp.route('/payments/<int:payment_id>/receipt', methods=['GET'])
@token_required
def get_payment_receipt(payment_id):
    payment = verify_and_get_payment(payment_id, request.current_user)
    if not payment:
        return jsonify({"error": "Payment record not found", "code": "NOT_FOUND"}), 404

    receipt = build_receipt_dict(payment)
    return jsonify({"receipt": receipt}), 200

@payment_bp.route('/payments/<int:payment_id>/receipt/pdf', methods=['GET'])
@token_required
def download_payment_receipt_pdf(payment_id):
    payment = verify_and_get_payment(payment_id, request.current_user)
    if not payment:
        return jsonify({"error": "Payment record not found", "code": "NOT_FOUND"}), 404

    pdf_buffer = generate_receipt_pdf(payment)
    return send_file(
        pdf_buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f"VSCMS_Receipt_REC-{payment.Payment_ID:05d}.pdf"
    )

@payment_bp.route('/receipts', methods=['GET'])
@token_required
def list_customer_receipts():
    user = request.current_user
    
    if user.Role == 'customer':
        payments = Payment.query.join(Invoice).join(Service_Request).filter(
            Service_Request.Customer_ID == user.User_ID,
            Payment.Status == 'Success'
        ).order_by(Payment.Created_At.desc()).all()
    elif user.Role in ['admin', 'center', 'mechanic']:
        center_id = get_current_center_id(user)
        payments = scoped_payments(center_id).filter(Payment.Status == 'Success').order_by(Payment.Created_At.desc()).all()
    elif user.Role == 'platform_admin':
        param_cid = request.args.get('center_id', type=int)
        if param_cid:
            payments = scoped_payments(param_cid).filter(Payment.Status == 'Success').order_by(Payment.Created_At.desc()).all()
        else:
            payments = Payment.query.filter_by(Status='Success').order_by(Payment.Created_At.desc()).all()
    else:
        payments = []

    receipts = [build_receipt_dict(p) for p in payments]
    return jsonify({"receipts": receipts}), 200
