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
from liber_content_factory.agents.pipeline import app as adk_app
from liber_content_factory.security.gateway import check_request_security

logger = logging.getLogger(__name__)


def get_quotes(handler: BaseHTTPRequestHandler) -> None:
    """Handles GET /api/quotes."""
    try:
        parsed_path = urlparse(handler.path)
        query_params = parse_qs(parsed_path.query)
        tag = query_params.get('tag', [None])[0]
        
        quotes = read_json_file(QUOTES_DB_FILE)
        if tag and tag != 'all':
            quotes = [q for q in quotes if tag in q.get('tags', [])]
            
        handler.send_response(200)
        handler.send_header('Access-Control-Allow-Origin', '*')
        handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        handler.send_header('Content-type', 'application/json')
        handler.end_headers()
        handler.wfile.write(json.dumps(quotes).encode())
    except Exception as e:
        logger.error(f"Error reading quotes: {e}")
        handler.send_response(500)
        handler.send_header('Access-Control-Allow-Origin', '*')
        handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        handler.send_header('Content-type', 'application/json')
        handler.end_headers()
        handler.wfile.write(json.dumps({"error": "Failed to read quotes"}).encode())


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
            handler.wfile.write(json.dumps({"error": "Text and author are required"}).encode())
            return
            
        new_quote = {
            "id": str(uuid.uuid4()),
            "text": data['text'],
            "author": data['author'],
            "tags": data.get('tags', []),
            "created_at": int(time.time() * 1000)
        }
        
        quotes = read_json_file(QUOTES_DB_FILE)
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
    except Exception as e:
        logger.error(f"Error creating quote: {e}")
        handler.send_response(500)
        handler.send_header('Access-Control-Allow-Origin', '*')
        handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        handler.send_header('Content-type', 'application/json')
        handler.end_headers()
        handler.wfile.write(json.dumps({"error": "Failed to create quote"}).encode())


def put_quote(handler: BaseHTTPRequestHandler, post_data: str, quote_id: str) -> None:
    """Handles PUT /api/quotes/:id."""
    try:
        data = json.loads(post_data)
        quotes = read_json_file(QUOTES_DB_FILE)
        updated = False
        
        for q in quotes:
            if q.get('id') == quote_id:
                q['text'] = data.get('text', q['text'])
                q['author'] = data.get('author', q['author'])
                q['tags'] = data.get('tags', q.get('tags', []))
                updated = True
                break
                
        if updated and write_json_file(QUOTES_DB_FILE, quotes):
            handler.send_response(200)
            handler.send_header('Access-Control-Allow-Origin', '*')
            handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
            handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            handler.send_header('Content-type', 'application/json')
            handler.end_headers()
            handler.wfile.write(json.dumps({"success": True}).encode())
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
    except Exception as e:
        logger.error(f"Error updating quote: {e}")
        handler.send_response(500)
        handler.send_header('Access-Control-Allow-Origin', '*')
        handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        handler.send_header('Content-type', 'application/json')
        handler.end_headers()
        handler.wfile.write(json.dumps({"error": "Failed to update quote"}).encode())


def delete_quote(handler: BaseHTTPRequestHandler, quote_id: str) -> None:
    """Handles DELETE /api/quotes/:id."""
    try:
        quotes = read_json_file(QUOTES_DB_FILE)
        initial_len = len(quotes)
        quotes = [q for q in quotes if q.get('id') != quote_id]
        
        if len(quotes) < initial_len:
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
    except Exception as e:
        logger.error(f"Error deleting quote: {e}")
        handler.send_response(500)
        handler.send_header('Access-Control-Allow-Origin', '*')
        handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        handler.send_header('Content-type', 'application/json')
        handler.end_headers()
        handler.wfile.write(json.dumps({"error": "Failed to delete quote"}).encode())


def handle_generate(handler: BaseHTTPRequestHandler, post_data: str) -> None:
    """Handles POST /api/generate."""
    is_allowed, status_code, error_msg = check_request_security(handler)
    if not is_allowed:
        handler.send_response(status_code)
        handler.send_header('Access-Control-Allow-Origin', '*')
        handler.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        handler.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        handler.send_header('Content-type', 'application/json')
        handler.end_headers()
        handler.wfile.write(json.dumps({"error": error_msg}).encode())
        return

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
            result["success"] = True
            result["text"] = result.get("draft", "")
            result["formatted_content"] = result.get("formatted", {})
            result["title"] = quote.get("title")
            result["author"] = quote.get("author", "AI Content Factory")
            result["category"] = quote.get("category", "General")
            result["source"] = quote.get("source")
            result["steps"] = [
                {"agent": "Planner", "status": "COMPLETED", "message": "Discovered candidate items (Simulated)."},
                {"agent": "DuplicateDetector", "status": "COMPLETED", "message": "Checked for duplicates (Simulated)."},
                {"agent": "Ranker", "status": "COMPLETED", "message": "Evaluated candidate relevance (Simulated)."},
                {"agent": "Researcher", "status": "COMPLETED", "message": "Enriched draft with facts (Simulated)."},
                {"agent": "Generator", "status": "COMPLETED", "message": "Generated creative copy (Simulated)."},
                {"agent": "Validator", "status": "COMPLETED", "message": "Validated quality checks (Simulated)."},
                {"agent": "Formatter", "status": "COMPLETED", "message": "Formatted for platforms (Simulated)."},
                {"agent": "MediaGenerator", "status": "COMPLETED", "message": "Generated media assets (Simulated)."}
            ]
        else:
            try:
                session_service = InMemorySessionService()
                user_id = "api-user"
                session_id = f"api-session-{uuid.uuid4().hex[:8]}"
                app_name = "agents"

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

                asyncio.run(run_app())
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
                    "success": True,
                    "draft": draft,
                    "text": draft,
                    "formatted": formatted,
                    "formatted_content": formatted,
                    "title": quote.get("title"),
                    "author": quote.get("author", "AI Content Factory"),
                    "category": quote.get("category", "General"),
                    "source": quote.get("source"),
                    "evaluation": {
                        "passed": passed,
                        "latency": time.time() - start_time,
                        "cost": 0.0
                    },
                    "platforms": list(formatted.keys()),
                    "media": media,
                    "session_id": session_id,
                    "steps": [
                        {"agent": "Planner", "status": "COMPLETED", "message": "Discovered candidate items."},
                        {"agent": "DuplicateDetector", "status": "COMPLETED", "message": "Checked database for duplicates."},
                        {"agent": "Ranker", "status": "COMPLETED", "message": "Evaluated candidate relevance and scores."},
                        {"agent": "Researcher", "status": "COMPLETED", "message": "Enriched quote with historical facts and details."},
                        {"agent": "Generator", "status": "COMPLETED", "message": "Generated creative copy drafts."},
                        {"agent": "Validator", "status": "COMPLETED", "message": "Auditing formatting and quality guidelines."},
                        {"agent": "Formatter", "status": "COMPLETED", "message": "Adapted copies for Twitter, LinkedIn, Instagram, etc."},
                        {"agent": "MediaGenerator", "status": "COMPLETED", "message": "Generated visual layout instructions and graphics."}
                    ]
                }
            except Exception as live_err:
                logger.warning(f"Live pipeline failed: {live_err}. Falling back to simulated generation.")
                result = generate_fallback_content(prompt_text, quote, strategy_name)
                result["success"] = True
                result["simulated"] = True
                result["text"] = result.get("draft", "")
                result["formatted_content"] = result.get("formatted", {})
                result["title"] = quote.get("title")
                result["author"] = quote.get("author", "AI Content Factory")
                result["category"] = quote.get("category", "General")
                result["source"] = quote.get("source")
                result["steps"] = [
                    {"agent": "Planner", "status": "COMPLETED", "message": "Discovered candidate items (Simulated Fallback)."},
                    {"agent": "DuplicateDetector", "status": "COMPLETED", "message": "Checked database for duplicates (Simulated Fallback)."},
                    {"agent": "Ranker", "status": "COMPLETED", "message": "Evaluated candidate relevance (Simulated Fallback)."},
                    {"agent": "Researcher", "status": "COMPLETED", "message": "Enriched quote with historical details (Simulated Fallback)."},
                    {"agent": "Generator", "status": "COMPLETED", "message": "Generated copy drafts (Simulated Fallback)."},
                    {"agent": "Validator", "status": "COMPLETED", "message": "Audited formatting guidelines (Simulated Fallback)."},
                    {"agent": "Formatter", "status": "COMPLETED", "message": "Formatted for platforms (Simulated Fallback)."},
                    {"agent": "MediaGenerator", "status": "COMPLETED", "message": "Generated media instructions (Simulated Fallback)."}
                ]
            
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
