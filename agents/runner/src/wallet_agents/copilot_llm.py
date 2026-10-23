"""CrewAI LLM adapter backed by the personal GitHub Copilot SDK."""

import asyncio
import os
from typing import Any

from .artifacts import RunnerError


def _format_messages(messages: str | list[dict[str, Any]]) -> str:
    if isinstance(messages, str):
        return messages
    if not isinstance(messages, list):
        raise RunnerError("Copilot SDK received an unsupported message payload")

    formatted = []
    for message in messages:
        if not isinstance(message, dict):
            raise RunnerError("Copilot SDK received a malformed message")
        role = message.get("role")
        content = message.get("content")
        if not isinstance(role, str) or not isinstance(content, str):
            raise RunnerError("Copilot SDK supports only text messages")
        formatted.append(f"[{role.upper()}]\n{content}")
    return "\n\n".join(formatted)


TOKEN_VARIABLES = ("COPILOT_GITHUB_TOKEN", "GH_TOKEN", "GITHUB_TOKEN")
TRUE_VALUES = {"true", "1", "yes", "s", "si"}


def use_logged_in_user() -> bool:
    return os.environ.get("COPILOT_USE_LOGGED_IN_USER", "true").strip().lower() in TRUE_VALUES


def client_options() -> dict[str, Any]:
    if use_logged_in_user():
        # Ambient tokens take precedence over the stored login, so remove them.
        env = {key: value for key, value in os.environ.items() if key not in TOKEN_VARIABLES}
        return {"use_logged_in_user": True, "env": env}
    token = os.environ.get("COPILOT_GITHUB_TOKEN")
    if not token:
        raise RunnerError("Set COPILOT_GITHUB_TOKEN or use COPILOT_USE_LOGGED_IN_USER=true")
    return {"github_token": token, "use_logged_in_user": False}


def create_copilot_llm(model: str, timeout: int):
    try:
        from crewai import BaseLLM
        from copilot import CopilotClient
        from copilot.generated.rpc import PermissionDecisionReject
    except ImportError as error:
        raise RunnerError("Install the pinned CrewAI and GitHub Copilot SDK dependencies") from error

    class CopilotSDKLLM(BaseLLM):
        def __init__(self):
            super().__init__(model=model, temperature=0)

        def call(
            self,
            messages,
            tools=None,
            callbacks=None,
            available_functions=None,
            **kwargs,
        ) -> str:
            if tools or available_functions:
                raise RunnerError("Copilot SDK integration does not permit model tools")
            prompt = _format_messages(messages)
            try:
                asyncio.get_running_loop()
            except RuntimeError:
                pass
            else:
                raise RunnerError("Copilot SDK adapter requires CrewAI's synchronous execution path")
            return asyncio.run(self._complete(prompt))

        async def _complete(self, prompt: str) -> str:
            async with CopilotClient(**client_options()) as client:
                session = await client.create_session(
                    model=self.model,
                    tools=[],
                    available_tools=[],
                    on_permission_request=lambda request, invocation: PermissionDecisionReject(
                        feedback="Tool use is disabled for CrewAI LLM requests"
                    ),
                    enable_config_discovery=False,
                    skip_custom_instructions=True,
                    enable_skills=False,
                    enable_session_store=False,
                    enable_session_telemetry=False,
                    enable_file_change_tracking=False,
                    enable_host_git_operations=False,
                    enable_citations=False,
                    mcp_servers={},
                )
                async with session:
                    response = await session.send_and_wait(prompt, timeout=timeout)
                await client.delete_session(session.session_id)

            content = getattr(getattr(response, "data", None), "content", None)
            if not isinstance(content, str) or not content.strip():
                raise RunnerError("Copilot SDK returned no assistant text")
            return content

        def supports_function_calling(self) -> bool:
            return False

    return CopilotSDKLLM()
