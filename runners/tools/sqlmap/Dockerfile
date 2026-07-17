# sqlmap sandbox image (§8). Bounded risk/level passed by the Scan MCP; the
# model never constructs args. Egress locked to the declared target at run time.
FROM python:3.12-slim

RUN pip install --no-cache-dir sqlmap && \
    useradd -m runner
USER runner
ENTRYPOINT ["sqlmap"]
