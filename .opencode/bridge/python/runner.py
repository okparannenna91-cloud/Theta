"""
Browser Use bridge runner.
Called by the TypeScript bridge to execute browser automation tasks.
Communicates via JSON over stdout.
"""

import asyncio
import json
import os
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

# Import browser_use lazily to handle import errors gracefully
try:
    from browser_use import Agent
    from browser_use.browser.profile import BrowserProfile
    from browser_use.browser.session import BrowserSession
    from browser_use.llm.openrouter.chat import ChatOpenRouter
    BROWSER_USE_AVAILABLE = True
except ImportError as e:
    BROWSER_USE_AVAILABLE = False
    _import_error = str(e)


def json_output(data: dict) -> None:
    """Write JSON to stdout for the TypeScript bridge to read."""
    print(json.dumps(data), flush=True)


def json_error(code: str, message: str, details: str | None = None) -> None:
    json_output({
        "success": False,
        "error": {"code": code, "message": message, "details": details},
    })


def build_llm() -> ChatOpenRouter:
    api_key = os.environ.get("OPENROUTER_API_KEY")
    base_url = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    model = os.environ.get("OPENROUTER_MODEL", "google/gemini-2.5-flash-preview-04-17")

    if not api_key:
        raise ValueError("OPENROUTER_API_KEY is not set")

    return ChatOpenRouter(
        model=model,
        api_key=api_key,
        base_url=base_url,
    )


def build_browser_profile(headless: bool | None = None) -> BrowserProfile:
    chrome_path = os.environ.get("CHROME_EXECUTABLE")
    headless_val = headless if headless is not None else (
        os.environ.get("HEADLESS", "false").lower() in ("true", "1")
    )

    kwargs: dict = {
        "headless": headless_val,
    }
    if chrome_path:
        kwargs["chrome_executable"] = chrome_path

    return BrowserProfile(**kwargs)


async def execute_task(task: str, config: dict) -> dict:
    execution_id = str(uuid4())
    start_time = time.time()

    llm = build_llm()
    browser_profile = build_browser_profile(config.get("headless"))

    session = BrowserSession(browser_profile=browser_profile)

    agent = Agent(
        task=task,
        llm=llm,
        browser_session=session,
        use_vision=True,
        max_failures=5,
        max_actions_per_step=5,
        use_thinking=True,
    )

    history = await agent.run(max_steps=config.get("max_steps", 100))

    duration = time.time() - start_time

    final_result = None
    if history and history.final_result():
        final_result = history.final_result()

    errors = []
    if history:
        for h in history:
            if h.errors:
                errors.extend(h.errors)
                break

    screenshots = []
    if history:
        for h in history:
            if hasattr(h, 'screenshot') and h.screenshot:
                screenshots.append(str(h.screenshot))

    return {
        "success": True,
        "execution_id": execution_id,
        "task": task,
        "duration_seconds": round(duration, 2),
        "model": llm.model,
        "steps": len(history) if history else 0,
        "result": final_result,
        "errors": errors[:10] if errors else [],
        "screenshots": screenshots,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def execute_test_suite(tests: list[dict], config: dict) -> dict:
    execution_id = str(uuid4())
    start_time = time.time()
    results = []

    llm = build_llm()
    browser_profile = build_browser_profile(config.get("headless"))
    session = BrowserSession(browser_profile=browser_profile)

    for test in tests:
        test_name = test.get("name", "unnamed")
        test_task = test.get("task", "")
        try:
            agent = Agent(
                task=test_task,
                llm=llm,
                browser_session=session,
                use_vision=True,
                max_failures=3,
                max_actions_per_step=5,
            )
            history = await agent.run(max_steps=config.get("max_steps", 50))
            results.append({
                "name": test_name,
                "success": True,
                "steps": len(history) if history else 0,
                "result": history.final_result() if history else None,
            })
        except Exception as e:
            results.append({
                "name": test_name,
                "success": False,
                "error": str(e),
            })

    duration = time.time() - start_time

    return {
        "success": True,
        "execution_id": execution_id,
        "results": results,
        "duration_seconds": round(duration, 2),
        "model": llm.model,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def main() -> None:
    if not BROWSER_USE_AVAILABLE:
        json_error("IMPORT_ERROR", f"browser_use is not available: {_import_error}")
        sys.exit(1)

    raw = sys.stdin.read()
    if not raw.strip():
        json_error("NO_INPUT", "No input received on stdin")
        sys.exit(1)

    try:
        request = json.loads(raw)
    except json.JSONDecodeError as e:
        json_error("INVALID_JSON", f"Invalid JSON input: {e}")
        sys.exit(1)

    action = request.get("action", "execute")

    try:
        if action == "execute":
            result = await execute_task(
                task=request.get("task", ""),
                config=request.get("config", {}),
            )
            json_output(result)
        elif action == "test_suite":
            result = await execute_test_suite(
                tests=request.get("tests", []),
                config=request.get("config", {}),
            )
            json_output(result)
        else:
            json_error("UNKNOWN_ACTION", f"Unknown action: {action}")
    except ValueError as e:
        json_error("CONFIG_ERROR", str(e))
    except ImportError as e:
        json_error("IMPORT_ERROR", str(e))
    except Exception as e:
        json_error(
            "EXECUTION_ERROR",
            str(e),
            traceback.format_exc(),
        )


if __name__ == "__main__":
    asyncio.run(main())
