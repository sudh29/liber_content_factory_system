import json
import urllib.request
import urllib.error
from unittest.mock import MagicMock, patch
import pytest
from datetime import datetime, timezone

from server import WebServerHandler

class MockHandler:
    def __init__(self, post_data, headers):
        self.rfile = MagicMock()
        self.rfile.read.return_value = post_data
        self.headers = headers
        self.response_status = None
        self.response_data = None

    def write_json_response(self, data, status=200):
        self.response_status = status
        self.response_data = data


@patch("server.read_json_file")
@patch("server.write_json_file")
@patch("urllib.request.urlopen")
def test_waha_publish_success(mock_urlopen, mock_write_json, mock_read_json):
    # Setup mocks
    mock_quotes = [
        {"id": "q_test", "text": "Do one thing everyday that scares you.", "author": "Eleanor Roosevelt", "status": "Unpublished"}
    ]
    mock_creds = {
        "wahaApiUrl": "http://localhost:3000",
        "wahaSession": "default",
        "wahaApiKey": "test-api-key"
    }
    
    # Configure mock responses for file reads
    def side_effect(filepath, default_val=None):
        if "quotes" in str(filepath):
            return mock_quotes
        if "credentials" in str(filepath):
            return mock_creds
        return []
    mock_read_json.side_effect = side_effect

    # Mock successful WAHA API response
    mock_response = MagicMock()
    mock_response.read.return_value = b'{"ok": true, "id": "status_123"}'
    mock_urlopen.return_value.__enter__.return_value = mock_response

    # Create handler and invoke handle_publish
    payload = json.dumps({
        "quoteId": "q_test",
        "platforms": ["whatsapp"]
    }).encode('utf-8')
    
    headers = {"Content-Length": str(len(payload))}
    handler = MockHandler(payload, headers)
    
    # Run publishing
    WebServerHandler.handle_publish(handler)
    
    # Verify request call to WAHA
    assert mock_urlopen.call_count == 1
    req_call_args = mock_urlopen.call_args[0][0]
    assert isinstance(req_call_args, urllib.request.Request)
    assert req_call_args.full_url == "http://localhost:3000/api/default/status/text"
    assert req_call_args.get_header("Content-type") == "application/json"
    assert req_call_args.get_header("X-api-key") == "test-api-key"
    
    # Verify response
    assert handler.response_status == 200
    assert handler.response_data["success"] is True
    
    # Verify status is updated
    assert handler.response_data["quote"]["status"] == "Published"
    assert "whatsapp" in handler.response_data["quote"]["publishedPlatforms"]
    
    # Check that a success log was generated
    success_logs = [l for l in handler.response_data["logs"] if l["type"] == "SUCCESS"]
    assert len(success_logs) > 0
    assert any("WhatsApp: Status updated" in l["message"] for l in success_logs)


@patch("server.read_json_file")
@patch("server.write_json_file")
@patch("urllib.request.urlopen")
def test_waha_publish_failure(mock_urlopen, mock_write_json, mock_read_json):
    # Setup mocks
    mock_quotes = [
        {"id": "q_test", "text": "Do one thing everyday that scares you.", "author": "Eleanor Roosevelt", "status": "Unpublished"}
    ]
    mock_creds = {
        "wahaApiUrl": "http://localhost:3000",
        "wahaSession": "default"
    }
    
    mock_read_json.side_effect = lambda filepath, default_val=None: mock_quotes if "quotes" in str(filepath) else (mock_creds if "credentials" in str(filepath) else [])

    # Mock HTTP Error from WAHA API (e.g. session not started)
    err_body = b'{"message": "Session is not connected"}'
    err_resp = MagicMock()
    err_resp.read.return_value = err_body
    mock_urlopen.side_effect = urllib.error.HTTPError(
        url="http://localhost:3000/api/default/status/text",
        code=400,
        msg="Bad Request",
        hdrs=None,
        fp=err_resp
    )

    # Invoke handle_publish
    payload = json.dumps({
        "quoteId": "q_test",
        "platforms": ["whatsapp"]
    }).encode('utf-8')
    
    headers = {"Content-Length": str(len(payload))}
    handler = MockHandler(payload, headers)
    
    # Run publishing
    WebServerHandler.handle_publish(handler)
    
    # Verify response succeeds despite channel failure (marked success, errors go to logs stream)
    assert handler.response_status == 200
    assert handler.response_data["success"] is True
    
    # Check that an error log was recorded for WAHA
    err_logs = [l for l in handler.response_data["logs"] if l["type"] == "ERROR"]
    assert len(err_logs) > 0
    assert any("WhatsApp WAHA HTTP 400: Session is not connected" in l["message"] for l in err_logs)
