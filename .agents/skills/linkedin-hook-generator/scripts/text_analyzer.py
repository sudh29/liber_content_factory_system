import sys
import json

def analyze(text):
    words = text.split()
    return {
        "word_count": len(words),
        "technical_terms": [w for w in words if len(w) > 8] # Naive extraction for demo
    }

if __name__ == "__main__":
    text = sys.stdin.read()
    print(json.dumps(analyze(text)))
