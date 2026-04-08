# Standard Library
import pathlib
import subprocess

# PIP3 modules
import pytest

# local repo modules
import git_file_utils

REPO_ROOT = pathlib.Path(git_file_utils.get_repo_root())
# Playwright may install browsers in node_modules or the system cache
LOCAL_BROWSER_DIR = REPO_ROOT / "node_modules" / "playwright-core" / ".local-browsers"
SYSTEM_CACHE_DIR = pathlib.Path.home() / "Library" / "Caches" / "ms-playwright"
SCREENSHOT_DIR = REPO_ROOT / "build" / "walkthrough"


#============================================
def _playwright_browsers_available() -> bool:
	"""Check whether Playwright has any downloaded browsers."""
	for browser_dir in (LOCAL_BROWSER_DIR, SYSTEM_CACHE_DIR):
		if browser_dir.is_dir() and any(browser_dir.iterdir()):
			return True
	return False


#============================================
def test_protocol_walkthrough_captures_screenshots() -> None:
	"""
	Run the scripted browser walkthrough and verify the final screenshot exists.
	"""
	if not _playwright_browsers_available():
		pytest.skip("Playwright Chromium is not installed. Run npx playwright install chromium first.")
	result = subprocess.run(
		["node", "devel/protocol_walkthrough.mjs", "--headless"],
		cwd=REPO_ROOT,
		check=False,
		capture_output=True,
		text=True,
	)
	assert result.returncode == 0, result.stderr or result.stdout
	# Verify the final results screenshot was saved
	final_screenshots = list(SCREENSHOT_DIR.glob("*results_screen*"))
	assert len(final_screenshots) > 0, "Final results screenshot not found"
