FROM docker.io/library/python:3.12.12-slim AS checks
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONPATH=/opt/runner/src
WORKDIR /opt/runner
RUN pip install --no-cache-dir pydantic==2.12.5 PyYAML==6.0.3 cryptography==50.0.2
COPY src ./src
COPY tests ./tests
CMD ["python", "-m", "unittest", "discover", "-s", "tests", "-v"]

FROM checks AS runtime
COPY pyproject.toml ./pyproject.toml
RUN pip install --no-cache-dir . \
    && COPILOT_CLI_EXTRACT_DIR=/opt/copilot-cli python -m copilot download-runtime
ENV CREWAI_DISABLE_TELEMETRY=true OTEL_SDK_DISABLED=true CREWAI_TRACING_ENABLED=false DO_NOT_TRACK=true HOME=/tmp XDG_DATA_HOME=/tmp/crewai-data
ENV COPILOT_CLI_EXTRACT_DIR=/opt/copilot-cli COPILOT_SKIP_CLI_DOWNLOAD=1
USER 65532:65532
ENTRYPOINT ["wallet-agents"]