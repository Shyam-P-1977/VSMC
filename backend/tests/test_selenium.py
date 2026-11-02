
import os
import unittest
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


BASE_URL = "http://localhost:5173"

SCREENSHOT_DIR = Path(__file__).parent / "screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


class TestVSMS(unittest.TestCase):

    def setUp(self):
        options = webdriver.ChromeOptions()
        options.add_argument("--start-maximized")

        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, 25)

    def tearDown(self):
        self.driver.quit()

    def save_screenshot(self, filename):
        path = SCREENSHOT_DIR / filename
        self.driver.save_screenshot(str(path))
        print(f"Screenshot saved: {path}")

    def test_TC10_invoice_receipt_details(self):
        driver = self.driver

        # STEP 1: Read customer credentials
        email = os.getenv("VSMS_CUSTOMER_EMAIL")
        password = os.getenv("VSMS_CUSTOMER_PASSWORD")

        self.assertTrue(
            email and password,
            "Set VSMS_CUSTOMER_EMAIL and VSMS_CUSTOMER_PASSWORD."
        )

        # STEP 2: Open customer login page
        driver.get(f"{BASE_URL}/login?tab=customer")

        email_field = self.wait.until(
            EC.visibility_of_element_located(
                (By.CSS_SELECTOR, "input[type='email']")
            )
        )

        password_field = driver.find_element(
            By.CSS_SELECTOR,
            "input[type='password']"
        )

        email_field.clear()
        email_field.send_keys(email)

        password_field.clear()
        password_field.send_keys(password)

        self.save_screenshot("TC10_customer_login.png")

        # STEP 3: Sign in as customer
        driver.find_element(
            By.XPATH,
            "//button[@type='submit' and contains(., 'Sign In as Customer')]"
        ).click()

        # Wait until login redirects to a customer page
        self.wait.until(
            lambda d: (
                "/customer/" in d.current_url
                or "/dashboard" in d.current_url
            )
        )

        # STEP 4: Open the customer receipts page
        driver.get(f"{BASE_URL}/customer/receipts")

        # Wait until the receipts page finishes loading
        self.wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//*[contains(normalize-space(.), 'Settled Invoices & Receipts') "
                    "or contains(normalize-space(.), 'No receipts available yet')]"
                )
            )
        )

        self.save_screenshot("TC10_receipts_page.png")

        # STEP 5: Verify that at least one receipt is available
        receipt_buttons = driver.find_elements(
            By.XPATH,
            "//button[contains(., 'View Receipt')]"
        )

        self.assertGreater(
            len(receipt_buttons),
            0,
            "No receipt is available for this customer. "
            "Complete and settle a service payment first."
        )

        # STEP 6: Open the first available receipt
        receipt_buttons[0].click()

        # STEP 7: Wait for the detailed receipt modal
        self.wait.until(
            EC.visibility_of_element_located(
                (
                    By.XPATH,
                    "//*[contains(normalize-space(.), 'Official Payment Receipt')]"
                )
            )
        )

        # STEP 8: Capture the displayed receipt information
        self.save_screenshot("TC10_detailed_receipt.png")

        receipt_text = driver.find_element(
            By.TAG_NAME,
            "body"
        ).text

        receipt_text_lower = receipt_text.lower()

        # STEP 9: Verify important receipt details
        required_details = [
            ("Receipt heading", "official payment receipt"),
            ("Paid status", "paid in full"),
            ("Transaction ID", "txn:"),
            ("Customer and vehicle section", "customer & vehicle details"),
            ("Service center details", "service center details"),
            ("Grand total", "grand total settled"),
            ("Payment mode", "payment mode"),
        ]

        for detail_name, expected_text in required_details:
            with self.subTest(detail=detail_name):
                self.assertIn(
                    expected_text,
                    receipt_text_lower,
                    f"Receipt is missing: {detail_name}"
                )

        # STEP 10: Verify the receipt contains a monetary amount
        self.assertIn(
            "₹",
            receipt_text,
            "No currency amount was found in the receipt."
        )

        self.save_screenshot("TC10_receipt_details_verified.png")

        print("\nTC-10 PASSED: Invoice receipt details were verified.")
        print("Verified receipt heading, paid status, transaction ID,")
        print("customer/vehicle details, service center, total and payment mode.")


if __name__ == "__main__":
    unittest.main(verbosity=2)
