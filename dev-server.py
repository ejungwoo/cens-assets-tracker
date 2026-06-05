#!/usr/bin/env python3
import argparse
import http.server
import os
import socketserver
import ssl
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
CERT_DIR = ROOT / ".devcert"
CERT_FILE = CERT_DIR / "localhost.pem"
KEY_FILE = CERT_DIR / "localhost-key.pem"
DEFAULT_FRONTEND_HOST = os.environ.get("FRONTEND_HOST", "127.0.0.1")
DEFAULT_FRONTEND_PORT = int(os.environ.get("FRONTEND_PORT", "5040"))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC), **kwargs)


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def ensure_cert():
    CERT_DIR.mkdir(exist_ok=True)
    if CERT_FILE.exists() and KEY_FILE.exists() and cert_has_subject_alt_name():
        return
    CERT_FILE.unlink(missing_ok=True)
    KEY_FILE.unlink(missing_ok=True)
    subprocess.run(
        [
            "openssl",
            "req",
            "-x509",
            "-newkey",
            "rsa:2048",
            "-keyout",
            str(KEY_FILE),
            "-out",
            str(CERT_FILE),
            "-sha256",
            "-days",
            "365",
            "-nodes",
            "-subj",
            "/CN=localhost",
            "-addext",
            "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1",
        ],
        check=True,
    )


def cert_has_subject_alt_name():
    result = subprocess.run(
        ["openssl", "x509", "-in", str(CERT_FILE), "-noout", "-ext", "subjectAltName"],
        check=False,
        capture_output=True,
        text=True,
    )
    return result.returncode == 0 and "Subject Alternative Name" in result.stdout


def main():
    parser = argparse.ArgumentParser(description="Serve CENS Assets Tracker locally.")
    parser.add_argument("--host", default=DEFAULT_FRONTEND_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_FRONTEND_PORT)
    parser.add_argument("--https", action="store_true")
    args = parser.parse_args()

    os.chdir(PUBLIC)
    with ReusableTCPServer((args.host, args.port), Handler) as httpd:
        protocol = "http"
        if args.https:
            ensure_cert()
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.load_cert_chain(certfile=CERT_FILE, keyfile=KEY_FILE)
            httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
            protocol = "https"
        print(f"Serving {PUBLIC} at {protocol}://{args.host}:{args.port}")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
