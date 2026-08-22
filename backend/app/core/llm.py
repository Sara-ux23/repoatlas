"""LLM factory with automatic API key rotation and model fallback."""

import os
import logging

logger = logging.getLogger(__name__)


def _load_keys() -> list[str]:
    """Return all keys from environment variables."""
    seen, keys = set(), []
    for name in [
        "GROQ_API_KEY",
        "GROQ_API_KEY_2",
        "GROQ_API_KEY_3",
        "GROQ_API_KEY_4",
        "GROQ_API_KEY_5",
        "GROQ_API_KEY_6",
    ]:
        k = os.getenv(name, "").strip()
        if k and k not in seen:
            keys.append(k)
            seen.add(k)
    if not keys:
        raise RuntimeError(
            "No GROQ_API_KEY(s) found in environment. Set GROQ_API_KEY in .env"
        )
    return keys


def get_llm(temperature: float = 0, model: str = "openai/gpt-oss-20b"):
    from langchain_groq import ChatGroq

    keys = _load_keys()
    return ChatGroq(model=model, temperature=temperature, api_key=keys[0])


async def invoke_with_rotation(
    messages: list,
    temperature: float = 0,
    model: str = "openai/gpt-oss-20b",
) -> str:
    """
    Invoke Groq LLM with key rotation AND automatic model fallback.
    Active Groq models as of August 2026 (llama-3.1-8b-instant and
    llama-3.3-70b-versatile were deprecated on Aug 16, 2026).
    """
    from langchain_groq import ChatGroq

    keys = _load_keys()

    # Active production Groq models (updated Aug 2026):
    # openai/gpt-oss-20b  → fast, low-latency (replaces llama-3.1-8b-instant)
    # openai/gpt-oss-120b → powerful (replaces llama-3.3-70b-versatile)
    # qwen/qwen3.6-27b    → alternate fallback
    models_to_try = [model]
    for fallback in ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.6-27b"]:
        if fallback not in models_to_try:
            models_to_try.append(fallback)

    last_error = None
    for target_model in models_to_try:
        for i, key in enumerate(keys):
            try:
                llm = ChatGroq(
                    model=target_model, temperature=temperature, api_key=key
                )
                import asyncio
                response = await asyncio.wait_for(
                    llm.ainvoke(messages),
                    timeout=20.0
                )
                if i > 0 or target_model != model:
                    logger.info(
                        f"[llm] Successfully used fallback model '{target_model}' with key #{i+1}"
                    )
                return response.content
            except Exception as e:
                err = str(e).lower()
                logger.warning(f"[llm] Model '{target_model}' (Key #{i+1}) failed: {e}")
                last_error = e
    logger.error(f"[llm] ❌ All Groq keys and fallback models failed. Last error: {last_error}")
    return (
        "⚠️ **Groq API Error**: The Groq API key configured on the server is invalid, expired, or rate-limited.\n\n"
        "**Fix**: Please generate a free key at [console.groq.com/keys](https://console.groq.com/keys) and update `GROQ_API_KEY` in your Render Environment Variables."
    )