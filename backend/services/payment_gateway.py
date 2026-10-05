"""Mock payment gateway. Swap this module for a real PSP integration later."""
import random
import re
import time
from dataclasses import dataclass, field
from datetime import date

BANKS = ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra Bank",
         "Punjab National Bank", "Bank of Baroda", "Yes Bank"]
UPI_RE = re.compile(r"^[A-Za-z0-9._\-]{2,}@[A-Za-z]{2,}$")


@dataclass
class GatewayResult:
    approved: bool
    transaction_id: str = None
    reason: str = None
    last4: str = None
    states: list = field(default_factory=list)


def new_transaction_id():
    return "TXN" + "".join(random.choice("0123456789") for _ in range(10))


def validate_details(method, details):
    """Return (clean_details, error_message_or_None, field)."""
    d = details or {}
    if method == "UPI":
        upi = str(d.get("upi_id", "")).strip()
        if not UPI_RE.match(upi):
            return None, "Enter a valid UPI ID (e.g. name@bank)", "upi_id"
        return {"upi_id": upi}, None, None
    if method == "Card":
        num = re.sub(r"[\s\-]", "", str(d.get("card_number", "")))
        if not num.isdigit() or not 13 <= len(num) <= 19:
            return None, "Enter a valid card number", "card_number"
        m = re.match(r"^(\d{2})\s*/\s*(\d{2})$", str(d.get("expiry", "")).strip())
        if not m or not 1 <= int(m.group(1)) <= 12:
            return None, "Enter expiry as MM/YY", "expiry"
        today = date.today()
        yy, mm = 2000 + int(m.group(2)), int(m.group(1))
        if (yy, mm) < (today.year, today.month):
            return None, "Card has expired", "expiry"
        if not re.match(r"^\d{3,4}$", str(d.get("cvv", ""))):
            return None, "Enter a valid CVV", "cvv"
        return {"card_number": num, "last4": num[-4:]}, None, None   # CVV deliberately dropped
    if method == "NetBanking":
        bank = str(d.get("bank", "")).strip()
        if bank not in BANKS:
            return None, "Select a bank", "bank"
        return {"bank": bank}, None, None
    return None, "Unsupported payment method", "method"


def charge(method, clean_details, amount, delay=1.5):
    """Simulate processing. Approve by default; card ending 0000 or UPI containing 'fail' declines."""
    states = ["PaymentInitiated", "Processing"]
    if delay:
        time.sleep(delay)
    last4 = clean_details.get("last4")
    if method == "Card" and clean_details["card_number"].endswith("0000"):
        return GatewayResult(False, None, "Card declined by issuing bank", last4, states + ["Failed"])
    if method == "UPI" and "fail" in clean_details["upi_id"].lower():
        return GatewayResult(False, None, "UPI transaction declined", None, states + ["Failed"])
    return GatewayResult(True, new_transaction_id(), None, last4, states + ["Authorized", "Success"])
