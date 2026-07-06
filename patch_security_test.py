with open("tests/test_security_policies.py", "r") as f:
    content = f.read()

import re
content = re.sub(
    r'from src\.security_policies import \(\n    validate_input_safety,\n    validate_output_safety,\n    SecurityPolicyViolation,\n    MAX_INPUT_LENGTH,\n\)',
    'from liber_content_factory.security.guardrails import validate_input_safety, validate_output_safety, SecurityPolicyViolation\nfrom liber_content_factory.config.constants import MAX_INPUT_LENGTH',
    content
)

with open("tests/test_security_policies.py", "w") as f:
    f.write(content)
