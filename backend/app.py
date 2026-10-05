"""Entry point for `flask run` (FLASK_APP autodetects app.py)."""
from factory import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
