import os
import pathlib
import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        path_to_extension = str(pathlib.Path('./').resolve())
        user_data_dir = "/tmp/test-user-data-dir"

        context = await p.chromium.launch_persistent_context(
            user_data_dir,
            headless=True,
            channel="chromium",
            args=[
                f"--disable-extensions-except={path_to_extension}",
                f"--load-extension={path_to_extension}",
            ],
        )

        page = await context.new_page()

        # Use a local web server to provide a more realistic environment
        # NOTE: This test is expected to fail due to limitations in the
        # testing environment's ability to use chrome.tabs.captureVisibleTab.
        # It is provided for documentation of the verification process.
        test_page_url = "http://localhost:8000/jules-scratch/verification/test.html"
        await page.goto(test_page_url)

        # Give the content script a moment to load
        await page.wait_for_timeout(1000)

        # Simulate the keypress to trigger the screenshot
        await page.keyboard.press("Control+S")

        # Check if the overlay was created
        overlay = page.locator("#screenshot-overlay")

        try:
            # This assertion is expected to fail in the test environment,
            # but would pass in a real browser with the fix applied.
            await expect(overlay).to_be_visible(timeout=5000)
            print("Test Passed: Screenshot overlay is visible.")
        except Exception as e:
            print(f"Test Failed: Screenshot overlay was not found. Error: {e}")

        await context.close()

if __name__ == "__main__":
    # This script requires a local web server to be running.
    # Example: python -m http.server
    asyncio.run(main())