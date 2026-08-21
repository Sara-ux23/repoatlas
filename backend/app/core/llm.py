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
    Invoke Groq LLM with key rotation AND automatic model fallback
    if 413 (context too large), 429 (rate limit), or TPM limits are hit.
    """
    from langchain_groq import ChatGroq

    keys = _load_keys()

    # Fallback cascade: Primary model -> openai/gpt-oss-20b -> openai/gpt-oss-120b -> qwen/qwen3.6-27b
    models_to_try = [model]
    if "openai/gpt-oss-20b" not in models_to_try:
        models_to_try.append("openai/gpt-oss-20b")
    if "openai/gpt-oss-120b" not in models_to_try:
        models_to_try.append("openai/gpt-oss-120b")
    if "qwen/qwen3.6-27b" not in models_to_try:
        models_to_try.append("qwen/qwen3.6-27b")

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
                if any(
                    x in err
                    for x in [
                        "413",
                        "429",
                        "tpm",
                        "token",
                        "limit",
                        "quota",
                        "rate",
                        "connection",
                        "timeout",
                        "403",
                    ]
                ):
                    logger.warning(
                        f"[llm] Model '{target_model}' (Key #{i+1}) limit/error: {e}"
                    )
                    last_error = e
                    continue
                raise

    raise RuntimeError(
        f"All Groq keys and fallback models failed. Last error: {last_error}"
    )