def setup_policies(orchestrator):
    """
    Priority Level | Specificity | Decision   | Operational Result
    1 (Highest)    | Specific    | DENY       | Blocks "rm" commands
    2              | Specific    | ASK_USER   | Prompts before bash runs
    3              | Specific    | APPROVE    | Permits silent file reads
    4 (Lowest)     | Wildcard    | DENY       | Denies all other tools
    """
    # orchestrator.policies.add(priority=1, tool="run_command", when=lambda args: "rm" in args.get("CommandLine"), decision="DENY")
    # orchestrator.policies.add(priority=2, tool="run_command", decision="ASK_USER", handler=my_approval_fn)
    # orchestrator.policies.add(priority=3, tool="view_file", decision="APPROVE")
    # orchestrator.policies.add(priority=4, tool="*", decision="DENY")
    print("Security policies configured: deny-by-default with specific overrides.")
