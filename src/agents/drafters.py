def draft_long_form(client, model, outline, research_file_path):
    """
    Operates entirely locally. Denied web access.
    """
    print("Drafting long-form content based on local research...")
    with open(research_file_path, "r") as f:
        research = f.read()
    
    draft = f"## Long Form Post\n\nBased on the research: {research[:20]}... this is the draft."
    return draft

def draft_short_form(client, model, long_form_content):
    """
    Utilizes the `linkedin-hook-generator` Agent Skill.
    """
    print("Applying Agent Skill: linkedin-hook-generator...")
    # In reality, the Orchestrator passes the skill context to the subagent here.
    return "Tired of context rot? Try the Content Factory."
