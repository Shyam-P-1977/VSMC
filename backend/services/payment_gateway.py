import random
import time
from datetime import datetime
from extensions import db
from models import Invoice, Payment, Status_History
from services.notification_service import notify_user

def generate_transaction_id():
    now_part = int(datetime.utcnow().timestamp() * 1000)
    rand_part = random.randint(10000, 99999)
    return f"TXN{now_part}{rand_part}"

def process_payment(invoice_id: int, method: str, details: dict):
    """
    Mock payment processing logic:
    - method: 'UPI', 'Card', 'NetBanking', 'Cash'
    - details: {
        'card_number': '...',
        'upi_id': '...',
        'bank_name': '...',
        'amount': ...
      }
    - Fails if card_number ends in '0000' or upi_id contains 'fail'
    """
    invoice = db.session.get(Invoice, invoice_id)
    if not invoice:
        raise LookupError("Invoice not found")

    if invoice.Status == 'Paid':
        raise ValueError("Invoice is already paid")

    amount = details.get("amount", invoice.Total_Amount)
    card_number = str(details.get("card_number", "")).strip()
    upi_id = str(details.get("upi_id", "")).strip().lower()

    # Determine Card last 4
    card_last4 = card_number[-4:] if len(card_number) >= 4 else None

    # Check simulated failure rules
    is_failure = False
    failure_reason = None

    if method == 'Card' and card_number.endswith("0000"):
        is_failure = True
        failure_reason = "Simulated card authorization failure (card ended in 0000)"
    elif method == 'UPI' and 'fail' in upi_id:
        is_failure = True
        failure_reason = "Simulated UPI authorization failure (UPI ID contained 'fail')"

    txn_id = generate_transaction_id()

    if is_failure:
        payment = Payment(
            Invoice_ID=invoice.Invoice_ID,
            Amount=amount,
            Method=method,
            Transaction_ID=txn_id,
            Status='Failed',
            Failure_Reason=failure_reason,
            Card_Last4=card_last4,
            Created_At=datetime.utcnow()
        )
        db.session.add(payment)
        db.session.commit()
        return {
            "success": False,
            "status": "Failed",
            "payment": payment.to_dict(),
            "message": failure_reason
        }

    # Successful payment
    payment = Payment(
        Invoice_ID=invoice.Invoice_ID,
        Amount=amount,
        Method=method,
        Transaction_ID=txn_id,
        Status='Success',
        Failure_Reason=None,
        Card_Last4=card_last4,
        Created_At=datetime.utcnow()
    )
    invoice.Status = 'Paid'
    db.session.add(payment)

    # Add entry to request history
    if invoice.request:
        history = Status_History(
            Request_ID=invoice.request.Request_ID,
            Status=invoice.request.Status,
            Changed_By=invoice.request.Customer_ID,
            Note=f"Payment received (Rs. {amount:.2f} via {method}, Txn ID: {txn_id})"
        )
        db.session.add(history)

        notify_user(
            invoice.request.Customer_ID,
            f"Payment of Rs. {amount:.2f} received successfully for Invoice {invoice.Invoice_Number}. Thank you!"
        )

    db.session.commit()
    return {
        "success": True,
        "status": "Success",
        "payment": payment.to_dict(),
        "invoice": invoice.to_dict(),
        "message": "Payment processed successfully"
    }

def record_manual_payment(invoice_id: int, method: str, admin_user_id: int, notes: str = None):
    """
    Admin recording manual cash/card payment.
    """
    invoice = db.session.get(Invoice, invoice_id)
    if not invoice:
        raise LookupError("Invoice not found")

    if invoice.Status == 'Paid':
        raise ValueError("Invoice is already marked as Paid")

    txn_id = generate_transaction_id()
    payment = Payment(
        Invoice_ID=invoice.Invoice_ID,
        Amount=invoice.Total_Amount,
        Method=method,
        Transaction_ID=txn_id,
        Status='Success',
        Failure_Reason=None,
        Card_Last4=None,
        Created_At=datetime.utcnow()
    )
    invoice.Status = 'Paid'
    db.session.add(payment)

    if invoice.request:
        history = Status_History(
            Request_ID=invoice.request.Request_ID,
            Status=invoice.request.Status,
            Changed_By=admin_user_id,
            Note=f"Manual payment recorded by Admin: Rs. {invoice.Total_Amount:.2f} via {method}. {notes or ''}"
        )
        db.session.add(history)
        notify_user(
            invoice.request.Customer_ID,
            f"Manual payment received for Invoice {invoice.Invoice_Number} via {method}."
        )

    db.session.commit()
    return payment
