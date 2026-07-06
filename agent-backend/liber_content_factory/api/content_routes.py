"""
Content generation and CRUD routes.

Handles /api/generate and /api/quotes HTTP endpoints.
"""

import asyncio
import json
import uuid
import time
import logging
from urllib.parse import urlparse, parse_qs
from http.server import BaseHTTPRequestHandler

from google.adk.runners import Runner
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.genai import types

from liber_content_factory.api.storage import QUOTES_DB_FILE, read_json_file, write_json_file
from liber_content_factory.services.fallback import generate_fallback_content
from liber_content_factory.config.constants import OUTPUT_DIR, HISTORY_FILE
from liber_content_factory.agents.pipeline import app as adk_app

logger = logging.getLogger(__name__)


def get_quotes(handler: BaseHTTPRequestHandler) -> None:
    """Handles GET /api/quotes."""
    parsed_path = urlparse(handler.path)
    query_params = parse_qs(parsed_path.query)
    
    quotes = read_json_file(QUOTES_DB_FILE)
    
    if 'category' in query_params:
        category = query_params['category'][0]
        quotes = [q for q in quotes if q.get('category', '').lower() == category.lower()]
        
    handler.send_response(200)
    handler.send_header('Access-Control-Allow-Origin', '*')
    handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    handler.send_header('Content-type', 'application/json')
    handler.end_headers()
    handler.wfile.write(json.dumps({"quotes": quotes}).encode())


def post_quote(handler: BaseHTTPRequestHandler, post_data: str) -> None:
    """Handles POST /api/quotes."""
    try:
        data = json.loads(post_data)
        if not data.get('text') or not data.get('author'):
            handler.send_response(400)
            handler.send_header('Access-Control-Allow-Origin', '*')
            handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            handler.send_header('Content-type', 'application/json')
            handler.end_headers()
            handler.wfile.write(json.dumps({"error": "Missing text or author"}).encode())
            return
            
        quotes = read_json_file(QUOTES_DB_FILE)
        
        new_quote = {
            "id": str(uuid.uuid4()),
            "text": data['text'],
            "author": data['author'],
            "category": data.get('category', 'General')
        }
        
        quotes.append(new_quote)
        
        if write_json_file(QUOTES_DB_FILE, quotes):
            handler.send_response(201)
            handler.send_header('Access-Control-Allow-Origin', '*')
            handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            handler.send_header('Content-type', 'application/json')
            handler.end_headers()
            handler.wfile.write(json.dumps(new_quote).encode())
        else:
            handler.send_response(500)
            handler.send_header('Access-Control-Allow-Origin', '*')
            handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            handler.send_header('Content-type', 'application/json')
            handler.end_headers()
            handler.wfile.write(json.dumps({"error": "Failed to save quote"}).encode())
    except json.JSONDecodeError:
        handler.send_response(400)
        handler.send_header('Access-Control-Allow-Origin', '*')
        handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        handler.send_header('Content-type', 'application/json')
        handler.end_headers()
        handler.wfile.write(json.dumps({"error": "Invalid JSON"}).encode())


def put_quote(handler: BaseHTTPRequestHandler, post_data: str, quote_id: str) -> None:
    """Handles PUT /api/quotes/<id>."""
    try:
        data = json.loads(post_data)
        quotes = read_json_file(QUOTES_DB_FILE)
        
        updated = False
        updated_quote = None
        
        for i, quote in enumerate(quotes):
            if quote.get('id') == quote_id:
                quotes[i].update({
                    "text": data.get('text', quote['text']),
                    "author": data.get('author', quote['author']),
                    "category": data.get('category', quote.get('category', 'General'))
                })
                updated_quote = quotes[i]
                updated = True
                break
                
        if updated and write_json_file(QUOTES_DB_FILE, quotes):
            handler.send_response(200)
            handler.send_header('Access-Control-Allow-Origin', '*')
            handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            handler.send_header('Content-type', 'application/json')
            handler.end_headers()
            handler.wfile.write(json.dumps(updated_quote).encode())
        elif not updated:
            handler.send_response(404)
            handler.send_header('Access-Control-Allow-Origin', '*')
            handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            handler.send_header('Content-type', 'application/json')
            handler.end_headers()
            handler.wfile.write(json.dumps({"error": "Quote not found"}).encode())
        else:
            handler.send_response(500)
            handler.send_header('Access-Control-Allow-Origin', '*')
            handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            handler.send_header('Content-type', 'application/json')
            handler.end_headers()
            handler.wfile.write(json.dumps({"error": "Failed to save quote"}).encode())
    except json.JSONDecodeError:
        handler.send_response(400)
        handler.send_header('Access-Control-Allow-Origin', '*')
        handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        handler.send_header('Content-type', 'application/json')
        handler.end_headers()
        handler.wfile.write(json.dumps({"error": "Invalid JSON"}).encode())


def delete_quote(handler: BaseHTTPRequestHandler, quote_id: str) -> None:
    """Handles DELETE /api/quotes/<id>."""
    quotes = read_json_file(QUOTES_DB_FILE)
    initial_length = len(quotes)
    
    quotes = [q for q in quotes if q.get('id') != quote_id]
    
    if len(quotes) < initial_length:
        if write_json_file(QUOTES_DB_FILE, quotes):
            handler.send_response(200)
            handler.send_header('Access-Control-Allow-Origin', '*')
            handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            handler.send_header('Content-type', 'application/json')
            handler.end_headers()
            handler.wfile.write(json.dumps({"success": True}).encode())
        else:
            handler.send_response(500)
            handler.send_header('Access-Control-Allow-Origin', '*')
            handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            handler.send_header('Content-type', 'application/json')
            handler.end_headers()
            handler.wfile.write(json.dumps({"error": "Failed to save database"}).encode())
    else:
        handler.send_response(404)
        handler.send_header('Access-Control-Allow-Origin', '*')
        handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        handler.send_header('Content-type', 'application/json')
        handler.end_headers()
        handler.wfile.write(json.dumps({"error": "Quote not found"}).encode())


def handle_generate(handler: BaseHTTPRequestHandler, post_data: str) -> None:
    """Handles POST /api/generate."""
    try:
        data = json.loads(post_data)
        prompt_text = data.get('prompt', '')
        quote = data.get('quote')
        strategy_name = data.get('strategy', 'quotes')
        simulate = data.get('simulate', False)
        
        logger.info(f"Received generation request: strategy='{strategy_name}', simulate={simulate}")
        start_time = time.time()
        
        if not quote:
            quotes = read_json_file(QUOTES_DB_FILE)
            if not quotes:
                quote = {
                    "text": prompt_text or "A thoughtful quote about creativity and growth",
                    "author": "Liber AI"
                }
            else:
                import random
                quote = random.choice(quotes)
                
        if simulate:
            result = generate_fallback_content(prompt_text, quote, strategy_name)
        else:
            session_service = InMemorySessionService()
            user_id = "api-user"
            session_id = f"api-session-{uuid.uuid4().hex[:8]}"
            app_name = "content-factory-api"

            asyncio.run(session_service.create_session(
                app_name=app_name,
                user_id=user_id,
                session_id=session_id,
            ))

            runner = Runner(
                app=adk_app,
                app_name=app_name,
                session_service=session_service,
            )

            async def run_app():
                input_query = f"Prompt: {prompt_text}\nQuote: {quote['text']} - {quote['author']}"
                new_message = types.Content(
                    role="user",
                    parts=[types.Part(text=input_query)],
                )
                events = []
                async for event in runner.run_async(
                    user_id=user_id,
                    session_id=session_id,
                    new_message=new_message,
                    state_delta={"strategy_name": strategy_name},
                ):
                    events.append(event)
                return events

            events = asyncio.run(run_app())
            session = asyncio.run(session_service.get_session(
                app_name=app_name,
                user_id=user_id,
                session_id=session_id,
            ))

            draft = session.state.get("draft", "")
            formatted = session.state.get("formatted_content", {})
            media = session.state.get("media_paths", [])
            passed = session.state.get("validation_passed", False)
            
            result = {
                "draft": draft,
                "formatted": formatted,
                "evaluation": {
                    "passed": passed,
                    "latency": time.time() - start_time,
                    "cost": 0.0
                },
                "platforms": list(formatted.keys()),
                "media": media
            }
            
        handler.send_response(200)
        handler.send_header('Access-Control-Allow-Origin', '*')
        handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        handler.send_header('Content-type', 'application/json')
        handler.end_headers()
        handler.wfile.write(json.dumps(result).encode())
        
    except json.JSONDecodeError:
        handler.send_response(400)
        handler.send_header('Access-Control-Allow-Origin', '*')
        handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        handler.send_header('Content-type', 'application/json')
        handler.end_headers()
        handler.wfile.write(json.dumps({"error": "Invalid JSON payload"}).encode())
    except Exception as e:
        logger.error(f"Generation error: {e}", exc_info=True)
        handler.send_response(500)
        handler.send_header('Access-Control-Allow-Origin', '*')
        handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        handler.send_header('Content-type', 'application/json')
        handler.end_headers()
        handler.wfile.write(json.dumps({"error": f"Generation failed: {str(e)}"}).encode())
