"""LLM factory with automatic API key rotation."""

import os
import logging

logger = logging.getLogger(__name__)


def _load_keys() -> list[str]:
    """Return all keys from environment variables."""
    seen, keys = set(), []
    for name in ["GROQ_API_KEY", "GROQ_API_KEY_2", "GROQ_API_KEY_3", "GROQ_API_KEY_4", "GROQ_API_KEY_5", "GROQ_API_KEY_6"]:
        k = os.getenv(name, "").strip()
        if k and k not in seen:
            keys.append(k)
            seen.add(k)
    if not keys:
        raise RuntimeError("No GROQ_API_KEY(s) found in environment. Set GROQ_API_KEY in .env")
    return keys


def get_llm(temperature: float = 0, model: str = "llama-3.3-70b-versatile"):
    from langchain_groq import ChatGroq
    keys = _load_keys()
    return ChatGroq(model=model, temperature=temperature, api_key=keys[0])


async def invoke_with_rotation(messages: list, temperature: float = 0, model: str = "llama-3.3-70b-versatile") -> str:
    from langchain_groq import ChatGroq
    keys = _load_keys()
    last_error = None
    for i, key in enumerate(keys):
        try:
            llm = ChatGroq(model=model, temperature=temperature, api_key=key)
            response = await llm.ainvoke(messages)
            if i > 0:
                logger.info(f"Used fallback Groq key #{i+1}")
            return response.content
        except Exception as e:
            err = str(e).lower()
            if any(x in err for x in ["429", "quota", "rate", "connection", "timeout", "403"]):
                logger.warning(f"Key #{i+1} failed: {e}")
                last_error = e
                continue
            raise
    raise RuntimeError(f"All Groq keys failed. Last: {last_error}")