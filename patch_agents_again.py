import re

with open("agent-backend/liber_content_factory/agents/planner.py", "r") as f:
    planner = f.read()

planner = planner.replace(
    "async def prepare_planner_input(callback_context: CallbackContext) -> None:\n    pass",
    "async def prepare_planner_input(callback_context: CallbackContext) -> None:\n    from liber_content_factory.security.guardrails import validate_input_safety\n    validate_input_safety(callback_context.state)\n"
)
with open("agent-backend/liber_content_factory/agents/planner.py", "w") as f:
    f.write(planner)

with open("agent-backend/liber_content_factory/agents/validator.py", "r") as f:
    validator = f.read()

validator = validator.replace(
    '''        if not passed:
            callback_context.state["revision_feedback"] = feedback
        else:
            callback_context.state["revision_feedback"] = ""''',
    '''        if not passed:
            callback_context.state["revision_feedback"] = feedback
        else:
            callback_context.state["revision_feedback"] = ""

        # Security output safety check
        from liber_content_factory.security.guardrails import validate_output_safety
        draft = callback_context.state.get("draft", "")
        validate_output_safety(draft)'''
)

with open("agent-backend/liber_content_factory/agents/validator.py", "w") as f:
    f.write(validator)
