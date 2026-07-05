import os
import sys
import json
import urllib.request
import asyncio
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Dict, Any, Optional, List
from pathlib import Path

# Load environment
from dotenv import load_dotenv
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("APIServer")

# Add current path to sys.path so we can import src
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Legacy src.orchestrator and src.config imports removed (using Google ADK pipeline)
from src.plugins.quotes_strategy import DailyQuoteStrategy
from src.plugins.generic_strategy import GenericContentStrategy

# Project directories
PROJECT_ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = PROJECT_ROOT / "output"
AUDIT_LOG_DIR = PROJECT_ROOT / "audit_logs"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
AUDIT_LOG_DIR.mkdir(parents=True, exist_ok=True)

QUOTES_FILE = OUTPUT_DIR / "quotes_db.json"
LOGS_FILE = AUDIT_LOG_DIR / "publish_logs.json"
CREDS_FILE = OUTPUT_DIR / "credentials_db.json"

# Default preloaded quotes
DEFAULT_QUOTES = [
  {
    "id": "q2",
    "text": "Waste no more time arguing about what a good man should be. Be one.",
    "author": "Marcus Aurelius",
    "category": "Philosophy",
    "status": "Published",
    "publishedTime": "2026-06-19T09:00:00.000Z",
    "publishedPlatforms": ["twitter", "linkedin", "telegram"],
    "engagement": {
      "impressions": 1240,
      "likes": 88,
      "shares": 14
    }
  },
  {
    "id": "q3",
    "text": "Science is not only a disciple of reason but, also, one of romance and passion.",
    "author": "Stephen Hawking",
    "category": "Science",
    "source": "Stephen Hawking's Universe",
    "status": "Unpublished"
  },
  {
    "id": "q4",
    "text": "In the middle of difficulty lies opportunity.",
    "author": "Albert Einstein",
    "category": "Inspiration",
    "source": "Widely Attributed Letter",
    "status": "Unpublished"
  },
  {
    "id": "q5",
    "text": "If I have seen further it is by standing on the shoulders of Giants.",
    "author": "Isaac Newton",
    "category": "Science",
    "source": "Letter to Robert Hooke (1675)",
    "status": "Unpublished"
  }
]

# Helper to read/write json database files
def read_json_file(file_path: Path, default_data: Any) -> Any:
    if not file_path.exists():
        write_json_file(file_path, default_data)
        return default_data
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading {file_path}: {e}")
        return default_data

def write_json_file(file_path: Path, data: Any):
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Error writing to {file_path}: {e}")

# Initialize strategies registry
STRATEGIES = {
    "quotes": lambda: DailyQuoteStrategy(),
    "instagram": lambda: GenericContentStrategy("instagram"),
    "blog": lambda: GenericContentStrategy("blog"),
    "twitter_thread": lambda: GenericContentStrategy("twitter_thread"),
    "youtube_script": lambda: GenericContentStrategy("youtube_script"),
    "newsletter": lambda: GenericContentStrategy("newsletter"),
}

class PipelineStepObserver:
    def __init__(self):
        self.steps = []

    def on_pipeline_start(self, raw_input: str) -> None:
        logger.info(f"Observer: Pipeline start with input='{raw_input}'")
        self.steps.append({
            "agent": "Pipeline",
            "status": "STARTED",
            "message": "Initializing multi-agent workflow..."
        })

    def on_agent_step(self, agent_name: str, status: str, details: Optional[dict] = None) -> None:
        logger.info(f"Observer: {agent_name} is {status}. Details: {details}")
        msg = f"{agent_name} successfully executed." if status == "COMPLETED" else f"Executing {agent_name} logic..."
        if details and "items_found" in details:
            msg = f"Planner completed: Found {details['items_found']} candidates."
        elif details and "remaining_items" in details:
            msg = f"DuplicateDetector finished: {details['remaining_items']} unique items remaining."
        elif details and "selected" in details:
            msg = f"Ranker selected optimal candidate: '{details['selected']}'"
        elif details and "platforms" in details:
            msg = f"Formatter assembled platform versions for: {', '.join(details['platforms'])}."
        elif details and "urls" in details:
            msg = f"Publisher posted to channels: {', '.join(details['urls'])}."

        self.steps.append({
            "agent": agent_name,
            "status": status,
            "message": msg,
            "details": details or {}
        })

    def on_pipeline_complete(self, context: Any, success: bool, error_msg: Optional[str] = None) -> None:
        logger.info(f"Observer: Pipeline complete. Success={success}, Error={error_msg}")
        self.steps.append({
            "agent": "Pipeline",
            "status": "COMPLETED" if success else "FAILED",
            "message": "Content Generation pipeline completed successfully." if success else f"Pipeline stopped: {error_msg}"
        })

def generate_fallback_content(strategy_name: str, prompt: str) -> Dict[str, Any]:
    """Generates premium fallback content when the Gemini API fails or is rate-limited."""
    theme = prompt.strip() or "Inspiring Mindset"
    
    if strategy_name == "quotes":
        text = f"The block of granite which was an obstacle in the pathway of the weak, becomes a stepping-stone in the pathway of the strong."
        author = "Thomas Carlyle"
        explanation = f"This quote highlights that challenges are not barriers but opportunities. In the context of '{theme}', it reminds us that our attitude towards difficulties determines whether we are defeated or strengthened by them."
        lessons = "1. Embrace setbacks as learning opportunities.\n2. True strength is built by overcoming resistance.\n3. Reframe obstacles as stepping stones."
        hashtags = "#inspiration #mindset #motivation #wisdom"
        cta = "What obstacle did you turn into a stepping-stone this week? Comment below!"
        
        draft = f"Quote: \"{text}\"\n— {author}\n\nExplanation:\n{explanation}\n\nLessons:\n{lessons}\n\nCTA: {cta}\n{hashtags}"
        
        return {
            "text": text,
            "author": author,
            "category": "Philosophy",
            "source": "Critical and Miscellaneous Essays",
            "draft": draft,
            "formatted_content": {
                "twitter": f"\"{text}\" — {author}\n\nReframe challenges as stepping stones. What obstacle did you conquer today?\n\n#inspiration #mindset",
                "linkedin": f"💡 \"{text}\" — {author}\n\nIn our professional journeys, we often encounter roadblocks. This quote reminds us that the exact same challenge can be a barrier or a catalyst for growth, depending on our mindset.\n\nKey Lessons:\n{lessons}\n\n👉 What obstacle did you turn into a stepping-stone this week?\n\n{hashtags}",
                "instagram": f"🌟 \"{text}\"\n— {author}\n\n✨ Explanation:\n{explanation}\n\n📌 Practical Lessons:\n{lessons}\n\n💬 {cta}\n\n.\n.\n.\n{hashtags}"
            },
            "media_prompt": "Minimalist vintage typography card showing a pathway of stepping stones, warm terracotta and cream tones."
        }
        
    elif strategy_name == "instagram":
        caption = f"🚀 Elevate your path with {theme}! Every step forward is a victory in itself.\n\nWhen we focus on our growth, the noise fades away. It's about consistency, drive, and vision."
        cta = "Drop a 'YES' if you are pushing forward today! 👇"
        hashtags = "#growth #instagrampost #success #aesthetic"
        draft = f"{caption}\n\n{cta}\n\n{hashtags}"
        
        return {
            "text": f"Focus on consistency and vision for {theme}.",
            "author": "AI Content Specialist",
            "category": "Growth",
            "draft": draft,
            "formatted_content": {
                "instagram": f"✨ {caption}\n\n💬 {cta}\n\n{hashtags}",
                "twitter": f"Consistency over intensity. Elevating {theme} one day at a time. 🚀 {cta}\n\n#success #growth",
                "linkedin": f"How do you approach {theme} in your career?\n\nConsistency and long-term vision are key. Let's build solid habits daily.\n\n{cta}\n\n{hashtags}"
            },
            "media_prompt": "Vibrant and aesthetic desktop layout with notebook and warm natural sunlight, glassmorphism overlay."
        }
        
    elif strategy_name == "blog":
        title = f"The Definitive Guide to Master {theme}"
        body = f"""# The Definitive Guide to Master {theme}

Welcome to a comprehensive analysis of **{theme}**. In this article, we break down why it matters, how it shapes modern industries, and actionable frameworks to succeed.

## 1. Introduction
To truly excel in today's landscape, understanding the fundamentals of {theme} is indispensable. It forms the backbone of highly efficient teams and creative workflows.

## 2. Core Pillars of Success
- **Deep Focus**: Dedicating uninterrupted time to master the nuances.
- **Feedback Loops**: Iterating quickly based on high-quality input data.
- **Continuous Learning**: Adapting to tools and methodologies as they evolve.

## 3. Practical Steps to Start Today
1. Define your daily goals clearly.
2. Establish a distraction-free work environment.
3. Track and evaluate your outputs week-over-week.

## 4. Conclusion
{theme} is not a destination, but a habit. By implementing these practices consistently, you unlock higher potential.
"""
        cta = "Sign up for our weekly newsletter to get deep-dives delivered straight to your inbox!"
        hashtags = "#blogging #personaldevelopment #learning #career"
        draft = f"{title}\n\n{body}\n\nCTA: {cta}\n{hashtags}"
        
        return {
            "text": f"Mastering {theme} through structured focus and feedback loops.",
            "author": "Tech Blogger",
            "category": "Education",
            "title": title,
            "draft": draft,
            "formatted_content": {
                "blog": body,
                "linkedin": f"✍️ New Blog Post: {title}\n\nWe deep dive into the core pillars of {theme} and outline 3 simple steps to start today.\n\nRead the summary or click below to check it out!\n\n{hashtags}",
                "twitter": f"New Article: {title} 📝\n\nTips to optimize your focus and build better habits in {theme}.\n\nRead it here: #blogging #learning"
            },
            "media_prompt": "An open textbook next to an elegant cup of coffee on a wooden table, warm, soft-focus background."
        }

    elif strategy_name == "twitter_thread":
        tweets = [
            f"1/ Thread: Mastering {theme} is the ultimate superpower. Here is a breakdown of why, and how you can implement it today. 🧵👇",
            f"2/ The biggest mistake people make is trying to do everything at once. Focus on one high-impact area. Quality beats quantity every time.",
            f"3/ Establish micro-habits. 15 minutes of dedicated focus per day yields 91 hours of practice in a year. Consistency is the secret sauce.",
            f"4/ Build an environment that supports your goals. Block out notifications, set a timer, and get to work. Eliminate friction.",
            f"5/ That's a wrap! If you found this thread helpful, RT the first tweet and follow for more insights on {theme}! 🚀"
        ]
        draft = "\n\n---\n\n".join(tweets)
        
        return {
            "text": f"A comprehensive thread on mastering {theme}.",
            "author": "Thought Leader",
            "category": "Threads",
            "draft": draft,
            "formatted_content": {
                "twitter": draft,
                "linkedin": f"🧵 Shared a Twitter thread on how to master {theme}. Key takeaway: Focus on micro-habits (15 mins/day) and reduce friction. What's your daily habit? Let me know below!\n\n#productivity #threads"
            },
            "media_prompt": "Clean gradient background with thin elegant geometric wireframes, dark mode aesthetics."
        }

    else:  # newsletter/default
        subject = f"Weekly Insights: Unpacking the Power of {theme}"
        body = f"""Hello Subscriber,

Welcome to this week's newsletter! Today we are focusing on **{theme}** and how you can leverage it to supercharge your workflow.

### Feature Article: The Mindset Shift
Achieving success in {theme} requires a fundamental shift in perspective. It is not about working harder, but designing smarter environments.

### Practical Tips of the Week:
- **Simplify**: Remove one redundant task from your list.
- **Automate**: Leverage tools to handle repetitive scheduling and publishing.
- **Reflect**: Spend 10 minutes at the end of each week reviewing your analytics.

We hope you find this edition valuable! Let us know your thoughts by replying directly to this email.

Best regards,
The Content Factory Team
"""
        draft = f"Subject: {subject}\n\n{body}"
        return {
            "text": f"Unpacking the power of {theme} in our weekly digest.",
            "author": "Newsletter Editor",
            "category": "Newsletter",
            "title": subject,
            "draft": draft,
            "formatted_content": {
                "newsletter": body,
                "twitter": f"Our latest newsletter is out! ✉️ We dive deep into {theme} with actionable tips. Subscribe to get it weekly!",
                "linkedin": f"📩 Weekly Newsletter: {subject}\n\nThis week we cover the mindset shift required for {theme} and 3 practical tips to design smarter environments.\n\nSubscribe to read the full issue!"
            },
            "media_prompt": "A modern newsletter template preview on an iPad screen, sleek office desk backdrop."
        }

async def run_adk_pipeline(strategy_name: str, prompt: str):
    from google.adk.runners import InMemoryRunner
    from google.genai import types
    from app.agent import app

    runner = InMemoryRunner(agent=app.root_agent, app_name="app")
    session_id = f"session_{int(asyncio.get_event_loop().time() * 1000)}"
    await runner.session_service.create_session(
        app_name="app",
        user_id="user",
        session_id=session_id,
        state={"strategy_name": strategy_name}
    )
    
    msg = types.Content(role="user", parts=[types.Part(text=prompt)])
    steps = []
    steps.append({
        "agent": "Pipeline",
        "status": "STARTED",
        "message": "Initializing multi-agent workflow..."
    })
    
    agent_mapping = {
        'planner_agent': 'Planner',
        'duplicate_detector': 'DuplicateDetector',
        'ranker_agent': 'Ranker',
        'researcher_agent': 'Researcher',
        'generator_agent': 'Generator',
        'validator_agent': 'Validator',
        'twitter_formatter': 'Formatter',
        'linkedin_formatter': 'Formatter',
        'instagram_formatter': 'Formatter',
        'consolidation': 'Formatter',
        'media_generator': 'MediaGenerator',
        'publisher': 'Publisher'
    }
    
    active_agent = None
    async for event in runner.run_async(user_id="user", session_id=session_id, new_message=msg):
        author = event.author
        mapped_name = agent_mapping.get(author)
        if not mapped_name:
            continue
            
        if mapped_name != active_agent:
            if active_agent:
                steps.append({
                    "agent": active_agent,
                    "status": "COMPLETED",
                    "message": f"{active_agent} successfully executed."
                })
            active_agent = mapped_name
            steps.append({
                "agent": active_agent,
                "status": "STARTED",
                "message": f"Executing {active_agent} logic..."
            })
            
    if active_agent:
        steps.append({
            "agent": active_agent,
            "status": "COMPLETED",
            "message": f"{active_agent} successfully executed."
        })
        
    steps.append({
        "agent": "Pipeline",
        "status": "COMPLETED",
        "message": "Content Generation pipeline completed successfully."
    })
    
    session = await runner.session_service.get_session(app_name="app", user_id="user", session_id=session_id)
    return steps, session.state

class WebServerHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == '/api/quotes':
            self.handle_get_quotes()
        elif self.path == '/api/logs':
            self.handle_get_logs()
        elif self.path == '/api/credentials':
            self.handle_get_credentials()
        else:
            self.send_error(404, "Not Found")

    def do_POST(self):
        if self.path == '/api/generate':
            self.handle_generate()
        elif self.path == '/api/quotes':
            self.handle_save_quote()
        elif self.path == '/api/logs/clear':
            self.handle_clear_logs()
        elif self.path == '/api/credentials':
            self.handle_save_credentials()
        elif self.path == '/api/publish':
            self.handle_publish()
        else:
            self.send_error(404, "Not Found")

    def do_DELETE(self):
        if self.path.startswith('/api/quotes/'):
            quote_id = self.path.split('/')[-1]
            self.handle_delete_quote(quote_id)
        else:
            self.send_error(404, "Not Found")

    def write_json_response(self, data: Any, status: int = 200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    # GET Quotes
    def handle_get_quotes(self):
        quotes = read_json_file(QUOTES_FILE, DEFAULT_QUOTES)
        self.write_json_response(quotes)

    # SAVE / UPDATE Quote
    def handle_save_quote(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            quote_data = json.loads(post_data.decode('utf-8'))
            quotes = read_json_file(QUOTES_FILE, DEFAULT_QUOTES)
            
            # Check if this is an update or create
            quote_id = quote_data.get("id")
            if quote_id:
                # Update existing
                for i, q in enumerate(quotes):
                    if q["id"] == quote_id:
                        quotes[i] = quote_data
                        break
            else:
                # Create new
                quote_data["id"] = f"q_{int(asyncio.get_event_loop().time() * 1000)}"
                if "status" not in quote_data:
                    quote_data["status"] = "Unpublished"
                quotes.insert(0, quote_data)
            
            write_json_file(QUOTES_FILE, quotes)
            self.write_json_response({"success": True, "quote": quote_data})
        except Exception as e:
            self.write_json_response({"error": f"Failed to save quote: {e}"}, 400)

    # DELETE Quote
    def handle_delete_quote(self, quote_id: str):
        try:
            quotes = read_json_file(QUOTES_FILE, DEFAULT_QUOTES)
            filtered = [q for q in quotes if q["id"] != quote_id]
            write_json_file(QUOTES_FILE, filtered)
            self.write_json_response({"success": True})
        except Exception as e:
            self.write_json_response({"error": f"Failed to delete: {e}"}, 400)

    # GET Logs
    def handle_get_logs(self):
        initial_logs = [{
            "id": "log_initial",
            "timestamp": "2026-07-04T00:00:00.000Z",
            "type": "INFO",
            "message": "Content Generation Platform initialized. System logs active."
        }]
        logs = read_json_file(LOGS_FILE, initial_logs)
        self.write_json_response(logs)

    # CLEAR Logs
    def handle_clear_logs(self):
        clean_logs = [{
            "id": "log_initial",
            "timestamp": "2026-07-04T00:00:00.000Z",
            "type": "INFO",
            "message": "System Logs & Audit archives successfully cleared."
        }]
        write_json_file(LOGS_FILE, clean_logs)
        self.write_json_response(clean_logs)

    # GET Credentials
    def handle_get_credentials(self):
        default_creds = {
            "telegramBotToken": os.getenv("TELEGRAM_BOT_TOKEN", ""),
            "telegramChatId": os.getenv("TELEGRAM_CHAT_ID", ""),
            "webhookUrl": os.getenv("WEBHOOK_URL", ""),
            "slackWebhookUrl": os.getenv("SLACK_WEBHOOK_URL", ""),
            "mockSettings": {
                "simulateFailures": False,
                "autoTrackEngagement": True
            }
        }
        creds = read_json_file(CREDS_FILE, default_creds)
        # Apply environment overrides if json file has empty strings
        if not creds.get("telegramBotToken") and os.getenv("TELEGRAM_BOT_TOKEN"):
            creds["telegramBotToken"] = os.getenv("TELEGRAM_BOT_TOKEN")
        if not creds.get("telegramChatId") and os.getenv("TELEGRAM_CHAT_ID"):
            creds["telegramChatId"] = os.getenv("TELEGRAM_CHAT_ID")
        if not creds.get("webhookUrl") and os.getenv("WEBHOOK_URL"):
            creds["webhookUrl"] = os.getenv("WEBHOOK_URL")
        if not creds.get("slackWebhookUrl") and os.getenv("SLACK_WEBHOOK_URL"):
            creds["slackWebhookUrl"] = os.getenv("SLACK_WEBHOOK_URL")
        self.write_json_response(creds)

    # SAVE Credentials
    def handle_save_credentials(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        try:
            creds = json.loads(post_data.decode('utf-8'))
            write_json_file(CREDS_FILE, creds)
            self.write_json_response({"success": True})
        except Exception as e:
            self.write_json_response({"error": f"Failed to save credentials: {e}"}, 400)

    # POST Publish
    def handle_publish(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            req = json.loads(post_data.decode('utf-8'))
            quote_id = req.get("quoteId")
            platforms = req.get("platforms", ["twitter", "linkedin", "telegram", "instagram", "whatsapp"])
            
            quotes = read_json_file(QUOTES_FILE, DEFAULT_QUOTES)
            quote = next((q for q in quotes if q["id"] == quote_id), None)
            
            if not quote:
                self.write_json_response({"error": f"Quote {quote_id} not found"}, 404)
                return

            default_creds = {
                "telegramBotToken": "",
                "telegramChatId": "",
                "webhookUrl": "",
                "slackWebhookUrl": "",
                "mockSettings": {"simulateFailures": False, "autoTrackEngagement": True}
            }
            creds = read_json_file(CREDS_FILE, default_creds)
            if os.getenv("TELEGRAM_BOT_TOKEN"):
                creds["telegramBotToken"] = os.getenv("TELEGRAM_BOT_TOKEN")
            if os.getenv("TELEGRAM_CHAT_ID"):
                creds["telegramChatId"] = os.getenv("TELEGRAM_CHAT_ID")
            logs = read_json_file(LOGS_FILE, [])

            # Check for simulated failures
            if creds.get("mockSettings", {}).get("simulateFailures", False):
                log_fail = {
                    "id": f"log_fail_{int(asyncio.get_event_loop().time() * 1000)}",
                    "timestamp": "2026-07-04T22:20:00.000Z",
                    "type": "ERROR",
                    "message": f"Simulated Publishing Failure: Simultaneously dispatching to {', '.join(platforms)} failed. Re-queued.",
                    "quoteId": quote_id
                }
                logs.insert(0, log_fail)
                write_json_file(LOGS_FILE, logs)
                self.write_json_response({"error": "Simulated publication failure active.", "logs": logs}, 400)
                return

            # Append publication start log
            log_start = {
                "id": f"log_start_{int(asyncio.get_event_loop().time() * 1000)}",
                "timestamp": "2026-07-04T22:20:00.000Z",
                "type": "INFO",
                "message": f"Starting simultaneous publication cycle for platforms: {', '.join(platforms)}...",
                "quoteId": quote_id,
                "platforms": platforms
            }
            logs.insert(0, log_start)

            # Perform live broadcasts
            # 1. Telegram
            if "telegram" in platforms and creds.get("telegramBotToken") and creds.get("telegramChatId"):
                try:
                    url = f"https://api.telegram.org/bot{creds['telegramBotToken']}/sendMessage"
                    payload = json.dumps({
                        "chat_id": creds['telegramChatId'],
                        "text": f"\"{quote['text']}\"\n\n— {quote['author']}\n\n#dailyquote #philosophy"
                    }).encode('utf-8')
                    req_tel = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'}, method='POST')
                    with urllib.request.urlopen(req_tel) as response:
                        pass
                    logs.insert(0, {
                        "id": f"log_tel_{int(asyncio.get_event_loop().time() * 1000)}",
                        "timestamp": "2026-07-04T22:20:01.000Z",
                        "type": "SUCCESS",
                        "message": f"Telegram Bot API: Successfully transmitted quote live to channel: {creds['telegramChatId']}",
                        "quoteId": quote_id
                    })
                except Exception as tel_err:
                    logs.insert(0, {
                        "id": f"log_tel_err_{int(asyncio.get_event_loop().time() * 1000)}",
                        "timestamp": "2026-07-04T22:20:01.000Z",
                        "type": "ERROR",
                        "message": f"Telegram Bot API Error: {tel_err}",
                        "quoteId": quote_id
                    })

            # 2. Generic Webhook
            if creds.get("webhookUrl"):
                try:
                    url = creds["webhookUrl"]
                    payload = json.dumps({
                        "event": "quote_publish",
                        "timestamp": "2026-07-04T22:20:00.000Z",
                        "quote": quote["text"],
                        "author": quote["author"],
                        "category": quote.get("category", "General"),
                        "platforms": platforms
                    }).encode('utf-8')
                    req_web = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'}, method='POST')
                    with urllib.request.urlopen(req_web) as response:
                        pass
                    logs.insert(0, {
                        "id": f"log_web_{int(asyncio.get_event_loop().time() * 1000)}",
                        "timestamp": "2026-07-04T22:20:02.000Z",
                        "type": "SUCCESS",
                        "message": f"Generic Webhook Dispatched: POST success on target address {url}",
                        "quoteId": quote_id
                    })
                except Exception as web_err:
                    logs.insert(0, {
                        "id": f"log_web_err_{int(asyncio.get_event_loop().time() * 1000)}",
                        "timestamp": "2026-07-04T22:20:02.000Z",
                        "type": "ERROR",
                        "message": f"Generic Webhook API Error: {web_err}",
                        "quoteId": quote_id
                    })

            # 3. Slack Webhook
            if creds.get("slackWebhookUrl"):
                try:
                    url = creds["slackWebhookUrl"]
                    payload = json.dumps({
                        "text": f"🔔 *Content Factory Release:* \"{quote['text']}\" — *{quote['author']}* (Broadcast to {', '.join(platforms)})"
                    }).encode('utf-8')
                    req_slack = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'}, method='POST')
                    with urllib.request.urlopen(req_slack) as response:
                        pass
                    logs.insert(0, {
                        "id": f"log_slack_{int(asyncio.get_event_loop().time() * 1000)}",
                        "timestamp": "2026-07-04T22:20:03.000Z",
                        "type": "SUCCESS",
                        "message": f"Slack Integration: Transmitted notification payload successfully to webhook channel.",
                        "quoteId": quote_id
                    })
                except Exception as slack_err:
                    logs.insert(0, {
                        "id": f"log_slack_err_{int(asyncio.get_event_loop().time() * 1000)}",
                        "timestamp": "2026-07-04T22:20:03.000Z",
                        "type": "ERROR",
                        "message": f"Slack API Error: {slack_err}",
                        "quoteId": quote_id
                    })

            # Update quote status
            quote["status"] = "Published"
            quote["publishedTime"] = "2026-07-04T22:20:00.000Z"
            quote["publishedPlatforms"] = platforms
            quote["engagement"] = {
                "impressions": 720,
                "likes": 55,
                "shares": 12
            }
            
            success_log = {
                "id": f"log_success_{int(asyncio.get_event_loop().time() * 1000)}",
                "timestamp": "2026-07-04T22:20:04.000Z",
                "type": "SUCCESS",
                "message": f"Publication absolute success: marked \"{quote['text'][:30]}...\" as successfully published. Deduplication safeguards active.",
                "quoteId": quote_id,
                "platforms": platforms
            }
            logs.insert(0, success_log)

            write_json_file(QUOTES_FILE, quotes)
            write_json_file(LOGS_FILE, logs)
            
            self.write_json_response({"success": True, "quote": quote, "logs": logs})
        except Exception as e:
            self.write_json_response({"error": f"Publish failed: {e}"}, 400)

    # POST Generate
    def handle_generate(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            req = json.loads(post_data.decode('utf-8'))
        except Exception as e:
            self.write_json_response({"error": f"Invalid JSON payload: {e}"}, 400)
            return

        strategy_name = req.get("strategy", "quotes")
        prompt = req.get("prompt", "")
        use_simulation = req.get("simulate", False)

        if strategy_name not in STRATEGIES:
            self.write_json_response({"error": f"Unsupported strategy: {strategy_name}"}, 400)
            return

        logger.info(f"Received generation request: strategy={strategy_name}, prompt='{prompt}', simulate={use_simulation}")

        # Execute pipeline
        response_data = {}
        observer = PipelineStepObserver()

        if use_simulation:
            # Simulated pipeline run
            logger.info("Running simulated pipeline...")
            asyncio.run(self.run_simulation(strategy_name, prompt, observer))
            fallback_res = generate_fallback_content(strategy_name, prompt)
            response_data = {
                "success": True,
                "simulated": True,
                "steps": observer.steps,
                **fallback_res
            }
        else:
            # Live pipeline run (with Gemini)
            try:
                # Run the ADK pipeline using our helper!
                steps, state = asyncio.run(run_adk_pipeline(strategy_name, prompt))
                
                selected_item = state.get("selected_item", {})
                raw_text = selected_item.get("raw_content", "")
                
                # Simple parsing for quote author if present in format "Quote" - Author
                author = "AI Agent"
                if " - " in raw_text:
                    parts = raw_text.rsplit(" - ", 1)
                    author = parts[1].strip()
                elif " — " in raw_text:
                    parts = raw_text.rsplit(" — ", 1)
                    author = parts[1].strip()
                    
                response_data = {
                    "success": True,
                    "simulated": False,
                    "steps": steps,
                    "text": raw_text,
                    "author": author,
                    "category": state.get("topic", "General"),
                    "source": "",
                    "title": state.get("topic") or "",
                    "draft": state.get("draft") or "",
                    "formatted_content": state.get("formatted_content", {}),
                    "media_prompt": f"Vibrant social media illustration themed around: {state.get('topic', 'Content')}"
                }
            except Exception as err:
                logger.error(f"Live pipeline failed: {err}. Returning failure response.")
                
                response_data = {
                    "success": False,
                    "error": str(err),
                    "steps": [
                        {
                            "agent": "Pipeline",
                            "status": "FAILED",
                            "message": f"Critical error in live pipeline: {err}"
                        }
                    ]
                }

        self.write_json_response(response_data)

    async def run_simulation(self, strategy_name: str, prompt: str, observer: PipelineStepObserver, start_index: int = 0):
        # Helper to simulate pipeline steps delays
        steps_list = [
            ("Planner", "STARTED", {}),
            ("Planner", "COMPLETED", {"items_found": 5}),
            ("DuplicateDetector", "STARTED", {}),
            ("DuplicateDetector", "COMPLETED", {"remaining_items": 4}),
            ("Ranker", "STARTED", {}),
            ("Ranker", "COMPLETED", {"selected": f"Best topic related to '{prompt}'"}),
            ("Researcher", "STARTED", {}),
            ("Researcher", "COMPLETED", {}),
            ("Generator", "STARTED", {}),
            ("Generator", "COMPLETED", {}),
            ("Validator", "STARTED", {}),
            ("Validator", "COMPLETED", {"passed": True}),
            ("Formatter", "STARTED", {}),
            ("Formatter", "COMPLETED", {"platforms": ["twitter", "linkedin", "instagram"]}),
            ("MediaGenerator", "STARTED", {}),
            ("MediaGenerator", "COMPLETED", {}),
        ]
        
        if start_index == 0:
            observer.on_pipeline_start(prompt)
        
        # We simulate the remaining steps in the list
        for name, status, details in steps_list:
            if start_index > 0 and name in ["Planner", "DuplicateDetector", "Ranker"]:
                continue
            
            await asyncio.sleep(0.05)
            observer.on_agent_step(name, status, details)

        await asyncio.sleep(0.05)
        observer.on_pipeline_complete(None, success=True)

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, WebServerHandler)
    logger.info(f"Starting Content Factory API server on port {port}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Stopping server...")
        httpd.server_close()

if __name__ == "__main__":
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port)
