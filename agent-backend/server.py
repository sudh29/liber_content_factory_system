"""
Content Factory System - API Server

Thin HTTP dispatcher that routes requests to the appropriate handlers in the
liber_content_factory.api package.
"""

import logging
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Import configuration to ensure environment is loaded at startup
from liber_content_factory.config.settings import load_config
load_config()

# Import route handlers
from liber_content_factory.api.content_routes import (
    get_quotes, post_quote, put_quote, delete_quote, handle_generate
)
from liber_content_factory.api.publish_routes import handle_publish
from liber_content_factory.api.settings_routes import handle_credentials, handle_logs


class QuoteAPIHandler(BaseHTTPRequestHandler):
    """
    HTTP Request Handler that routes requests to the appropriate api endpoints.
    """
    
    def _set_cors_headers(self):
        """Sets CORS headers for cross-origin requests from the frontend."""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        """Route GET requests."""
        parsed_path = urlparse(self.path)
        
        try:
            if parsed_path.path == '/api/quotes':
                self._set_cors_headers()
                get_quotes(self)
                
            elif parsed_path.path == '/api/credentials':
                self._set_cors_headers()
                handle_credentials(self)
                
            elif parsed_path.path == '/api/logs':
                self._set_cors_headers()
                handle_logs(self)
                
            else:
                self.send_response(404)
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Not found"}).encode())
                
        except Exception as e:
            logger.error(f"Error handling GET {parsed_path.path}: {e}")
            self.send_response(500)
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Internal server error"}).encode())

    def do_POST(self):
        """Route POST requests."""
        parsed_path = urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        try:
            if parsed_path.path == '/api/quotes':
                self._set_cors_headers()
                post_quote(self, post_data)
                
            elif parsed_path.path == '/api/generate':
                self._set_cors_headers()
                handle_generate(self, post_data)
                
            elif parsed_path.path == '/api/publish':
                self._set_cors_headers()
                handle_publish(self, post_data)
                
            else:
                self.send_response(404)
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Not found"}).encode())
                
        except Exception as e:
            logger.error(f"Error handling POST {parsed_path.path}: {e}", exc_info=True)
            self.send_response(500)
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Internal server error"}).encode())

    def do_PUT(self):
        """Route PUT requests."""
        parsed_path = urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        try:
            if parsed_path.path.startswith('/api/quotes/'):
                quote_id = parsed_path.path.split('/')[-1]
                self._set_cors_headers()
                put_quote(self, post_data, quote_id)
            else:
                self.send_response(404)
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Not found"}).encode())
        except Exception as e:
            logger.error(f"Error handling PUT {parsed_path.path}: {e}")
            self.send_response(500)
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Internal server error"}).encode())

    def do_DELETE(self):
        """Route DELETE requests."""
        parsed_path = urlparse(self.path)
        
        try:
            if parsed_path.path.startswith('/api/quotes/'):
                quote_id = parsed_path.path.split('/')[-1]
                self._set_cors_headers()
                delete_quote(self, quote_id)
            else:
                self.send_response(404)
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Not found"}).encode())
        except Exception as e:
            logger.error(f"Error handling DELETE {parsed_path.path}: {e}")
            self.send_response(500)
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Internal server error"}).encode())


def run_server(port=8000):
    """Starts the HTTP server."""
    server_address = ('', port)
    httpd = HTTPServer(server_address, QuoteAPIHandler)
    logger.info(f"Starting server on port {port}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
        logger.info("Server stopped.")


if __name__ == '__main__':
    run_server()
