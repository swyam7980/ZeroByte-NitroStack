# nuclei sandbox image (§8). Minimal, no shared volume, egress locked to the
# declared target at run time by the Scan MCP execution service.
FROM projectdiscovery/nuclei:latest

# Run as non-root; no shell tools beyond nuclei itself.
USER 1000
ENTRYPOINT ["nuclei"]
