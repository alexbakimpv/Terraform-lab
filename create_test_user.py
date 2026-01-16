#!/usr/bin/env python3
"""
Script to create a test student user in the manager app.
Since the system allows any non-admin email to log in, this just provides you with credentials.

Usage:
    python3 create_test_user.py [email] [password]

Example:
    python3 create_test_user.py test@example.com test123

If no arguments provided, uses default: test@example.com / test123
"""

import sys

# Configuration
TEST_EMAIL = sys.argv[1] if len(sys.argv) > 1 else "test@example.com"
TEST_PASSWORD = sys.argv[2] if len(sys.argv) > 2 else "test123"

def main():
    print("=" * 60)
    print("🧪 TEST STUDENT USER CREDENTIALS")
    print("=" * 60)
    print()
    print("The manager app allows any non-admin email to log in as a student.")
    print("You can use these credentials to test the student view:")
    print()
    print(f"📧 Email:    {TEST_EMAIL}")
    print(f"🔑 Password: {TEST_PASSWORD} (or any password)")
    print()
    print("💡 How it works:")
    print("   - Any email that doesn't end with @imperva.com is treated as a student")
    print("   - Any password is accepted for student accounts (lab mode)")
    print("   - On first login, a lab will be automatically created")
    print("   - Cloud Run service and DNS records will be provisioned")
    print()
    print("🚀 To log in:")
    print("   1. Go to https://manager.lab.amplifys.us")
    print(f"   2. Enter email: {TEST_EMAIL}")
    print(f"   3. Enter password: {TEST_PASSWORD} (or anything)")
    print("   4. Click 'AUTHENTICATE'")
    print()
    print("=" * 60)

if __name__ == "__main__":
    main()
