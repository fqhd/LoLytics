import json
import os
import requests
from PIL import Image
from io import BytesIO
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuration
JSON_FILE = "item.json"
OUTPUT_DIR = "lolytics/public/images/items"
CDN_BASE = "https://ddragon.leagueoflegends.com/cdn/16.19.1/img/item"
VERSION = "16.19.1"
MAX_WORKERS = 16


def load_item_ids(json_path):
    """Load the JSON file and extract all item IDs from the 'data' object."""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # The top-level structure has a "data" key containing items keyed by ID
    items = data.get("data", {})
    return list(items.keys())


def download_and_convert(item_id, session):
    """Download the PNG for an item and save it as a JPG."""
    png_url = f"{CDN_BASE}/{item_id}.png"
    out_path = os.path.join(OUTPUT_DIR, f"{item_id}.jpg")

    # Skip if already downloaded
    if os.path.exists(out_path):
        return item_id, "skipped"

    try:
        response = session.get(png_url, timeout=15)
        if response.status_code != 200:
            return item_id, f"failed (HTTP {response.status_code})"

        # Convert PNG -> JPG
        image = Image.open(BytesIO(response.content))
        # JPEG doesn't support alpha; convert to RGB with a white background
        if image.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", image.size, (255, 255, 255))
            # If palette mode, convert to RGBA first
            if image.mode == "P":
                image = image.convert("RGBA")
            background.paste(image, mask=image.split()[-1] if image.mode == "RGBA" else None)
            image = background
        else:
            image = image.convert("RGB")

        image.save(out_path, "JPEG", quality=95)
        return item_id, "downloaded"

    except Exception as e:
        return item_id, f"error: {e}"


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    item_ids = load_item_ids(JSON_FILE)
    print(f"Found {len(item_ids)} items in {JSON_FILE}")

    with requests.Session() as session:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            futures = {
                executor.submit(download_and_convert, item_id, session): item_id
                for item_id in item_ids
            }

            downloaded = 0
            skipped = 0
            failed = 0

            for future in as_completed(futures):
                item_id, status = future.result()
                if status == "downloaded":
                    downloaded += 1
                elif status == "skipped":
                    skipped += 1
                else:
                    failed += 1
                    print(f"[{item_id}] {status}")

    print(f"\nDone. Downloaded: {downloaded}, Skipped: {skipped}, Failed: {failed}")


if __name__ == "__main__":
    main()
