from flask import Blueprint, request, jsonify, send_file
from extensions import db, token_required, role_required
from models import Invoice, Payment, Service_Request
from services.payment_gateway import process_payment
from services.receipt_service import build_receipt_dict, generate_receipt_pdf

payment_bp = Blueprint('payment', __name__, url_prefix='/api')

def verify_payment_access(payment, user):
    if user.Role == 'platform_admin':
        return True
    if user.Role in ['admin', 'center']:
        target_center = user.center_id or (user.owned_center.id if user.owned_center else None)
        inv_center = payment.invoice.center_id if payment.invoice else None
        if target_center and inv_center and target_center == inv_center:
            return True
        return False
    if user.Role == 'customer':
        req = payment.invoice.request if payment.invoice else None
        return req and req.Customer_ID == user.User_ID
    return False

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
    payment = db.session.get(Payment, payment_id)
    if not payment:
        return jsonify({"error": "Payment record not found", "code": "NOT_FOUND"}), 404

    if not verify_payment_access(payment, request.current_user):
        return jsonify({"error": "Forbidden: You cannot access this receipt", "code": "FORBIDDEN"}), 403

    receipt = build_receipt_dict(payment)
    return jsonify({"receipt": receipt}), 200

@payment_bp.route('/payments/<int:payment_id>/receipt/pdf', methods=['GET'])
@token_required
def download_payment_receipt_pdf(payment_id):
    payment = db.session.get(Payment, payment_id)
    if not payment:
        return jsonify({"error": "Payment record not found", "code": "NOT_FOUND"}), 404

    if not verify_payment_access(payment, request.current_user):
        return jsonify({"error": "Forbidden: You cannot access this receipt", "code": "FORBIDDEN"}), 403

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
        # Get payments for all completed requests of this customer
        payments = Payment.query.join(Invoice).join(Service_Request).filter(
            Service_Request.Customer_ID == user.User_ID,
            Payment.Status == 'Success'
        ).order_by(Payment.Created_At.desc()).all()
    elif user.Role in ['admin', 'center']:
        target_center = user.center_id or (user.owned_center.id if user.owned_center else None)
        query = Payment.query.join(Invoice).filter(Payment.Status == 'Success')
        if target_center:
            query = query.filter(Invoice.center_id == target_center)
        payments = query.order_by(Payment.Created_At.desc()).all()
    else: # platform_admin
        payments = Payment.query.filter_by(Status='Success').order_by(Payment.Created_At.desc()).all()

    receipts = [build_receipt_dict(p) for p in payments]
    return jsonify({"receipts": receipts}), 200
