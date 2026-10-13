import os
from datetime import timedelta

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'vscms-super-secret-key-2026-production-ready')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'vscms-super-secret-jwt-token-key-2026-production-ready!')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or f"sqlite:///{os.path.join(basedir, 'vscms.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    UPLOAD_FOLDER = os.path.join(basedir, 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
    ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
    
    GST_RATE = 18.0

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
