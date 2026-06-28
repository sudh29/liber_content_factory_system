import os
import sys

# Mock for Kaggle Secrets
class UserSecretsClient:
    def get_secret(self, key):
        return f"mock_{key.lower()}"

def main():
    print("Initializing Content Factory in Kaggle Environment...")
    
    # Environment Provisioning and Secrets Management
    try:
        from kaggle_secrets import UserSecretsClient as KaggleSecrets
        user_secrets = KaggleSecrets()
    except ImportError:
        user_secrets = UserSecretsClient()
        
    os.environ["GEMINI_API_KEY"] = user_secrets.get_secret("GEMINI_API_KEY")
    os.environ["WEATHER_API_KEY"] = user_secrets.get_secret("WEATHER_API_KEY")
    
    # Import Orchestrator
    sys.path.append(os.path.join(os.path.dirname(__file__), "src"))
    from orchestrator import create_orchestrator
    from security_policies import setup_policies
    from hooks import register_hooks
    
    orchestrator_fn = create_orchestrator()
    setup_policies(orchestrator_fn)
    register_hooks(orchestrator_fn)
    
    # Execute Pipeline
    raw_input = "We need a blog post about how multi-agent systems are better than single LLMs. Single LLMs suffer from context rot after 40k tokens."
    result = orchestrator_fn(raw_input)
    
    print(f"Pipeline finished. Output archive: {result}")

if __name__ == "__main__":
    main()
