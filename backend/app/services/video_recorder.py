"""
Video recording service using Playwright with system Chrome to capture
real repo visualization walkthroughs.
"""

import asyncio
import hashlib
import logging
import shutil
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# System Chrome paths to try (Windows)
CHROME_PATHS = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]


def _find_system_chrome() -> Optional[str]:
    for path in CHROME_PATHS:
        if Path(path).exists():
            return path
    return None


class VideoRecorderService:

    def __init__(self):
        self.recordings_dir = (
            Path(__file__).resolve().parent.parent.parent / "static" / "recordings"
        )
        self.recordings_dir.mkdir(parents=True, exist_ok=True)

    # ── helpers ──────────────────────────────────────────────────────────────

    def get_repo_id(self, repo_url: str) -> str:
        return hashlib.md5(repo_url.encode()).hexdigest()[:12]

    def _video_path(self, repo_id: str) -> Path:
        """Preferred .webm path (Playwright native output)."""
        return self.recordings_dir / f"{repo_id}.webm"

    def video_exists(self, repo_id: str) -> bool:
        return self._video_path(repo_id).exists()

    def get_video_url(self, repo_id: str) -> str:
        return f"/static/recordings/{repo_id}.webm"

    # ── recording ────────────────────────────────────────────────────────────

    async def record_repo_walkthrough(
        self, repo_id: str, base_url: str = "http://localhost:3001"
    ) -> str:
        """
        Launch a headless Chrome, navigate to the visualization page,
        walk through each section, and save the video keyed by repo_id.
        Returns the path to the saved video file.
        """
        try:
            from playwright.async_api import async_playwright
        except ImportError:
            raise RuntimeError("Playwright not installed: pip install playwright")

        chrome_path = _find_system_chrome()
        if chrome_path is None:
            raise RuntimeError("System Chrome not found. Please install Chrome.")

        # Playwright writes the video to a temp dir named by a UUID;
        # we'll move it into our recordings dir afterwards.
        temp_dir = self.recordings_dir / f"_tmp_{repo_id}"
        temp_dir.mkdir(parents=True, exist_ok=True)

        target_path = self._video_path(repo_id)

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(
                    executable_path=chrome_path,
                    headless=True,
                    args=[
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-dev-shm-usage",
                        "--ignore-certificate-errors",
                    ],
                )

                context = await browser.new_context(
                    viewport={"width": 1440, "height": 900},
                    record_video_dir=str(temp_dir),
                    record_video_size={"width": 1440, "height": 900},
                )

                page = await context.new_page()

                # ── Navigate to visualization page ────────────────────────
                url = f"{base_url}/agents/visualization-agent"
                logger.info(f"[recorder] Navigating to {url}")
                await page.goto(url, wait_until="domcontentloaded", timeout=30_000)
                await asyncio.sleep(3)  # let React hydrate

                # ── Walkthrough sequence ──────────────────────────────────
                await self._walkthrough(page)

                # ── Close & flush the video file ──────────────────────────
                await context.close()
                await browser.close()

                # Find the webm Playwright wrote into temp_dir
                webm_files = list(temp_dir.glob("*.webm"))
                if not webm_files:
                    raise RuntimeError("Playwright produced no video file.")

                latest = max(webm_files, key=lambda f: f.stat().st_mtime)
                shutil.move(str(latest), str(target_path))
                logger.info(f"[recorder] Video saved → {target_path}")
                return str(target_path)

        finally:
            # Clean up temp dir
            if temp_dir.exists():
                shutil.rmtree(temp_dir, ignore_errors=True)

    # ── walkthrough sequence ─────────────────────────────────────────────────

    async def _walkthrough(self, page) -> None:
        """Scroll & click through every visualization section naturally."""

        async def _click_tab(text: str) -> bool:
            """Click a sidebar tab by its visible text. Returns True if found."""
            btn = page.locator(f"button:has-text('{text}')")
            if await btn.count() > 0:
                await btn.first.click()
                await asyncio.sleep(0.6)
                return True
            return False

        async def _scroll_to(selector: str) -> None:
            try:
                el = page.locator(selector).first
                if await el.count() > 0:
                    await el.scroll_into_view_if_needed()
                    await asyncio.sleep(0.4)
            except Exception:
                pass

        # ── 1. Structure Diagram ────────────────────────────────────────
        await _click_tab("Structure Diagram")
        await asyncio.sleep(4)  # read language breakdown
        await _scroll_to("text=Directory Tree")
        await asyncio.sleep(4)  # browse tree
        await _scroll_to("text=Dependency Graph")
        await asyncio.sleep(4)  # examine dependencies
        await page.evaluate("window.scrollTo({top:0, behavior:'smooth'})")
        await asyncio.sleep(1)

        # ── 2. Contributor Activity ─────────────────────────────────────
        await _click_tab("Contributor Activity")
        await asyncio.sleep(4)  # top contributors chart
        await _scroll_to("text=Monthly Activity")
        await asyncio.sleep(4)  # heatmap grid
        await page.evaluate("window.scrollTo({top:0, behavior:'smooth'})")
        await asyncio.sleep(1)

        # ── 3. AI Narrative (scroll back to Structure to show it) ───────
        await _click_tab("Structure Diagram")
        await asyncio.sleep(2)
        await _scroll_to(".bg-\\[\\#F0F6FF\\]")  # narrative box
        await asyncio.sleep(4)

        # ── Final: scroll to top ────────────────────────────────────────
        await page.evaluate("window.scrollTo({top:0, behavior:'smooth'})")
        await asyncio.sleep(2)

        logger.info("[recorder] Walkthrough sequence complete")


# Singleton
video_recorder = VideoRecorderService()
