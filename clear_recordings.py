"""
One-time cleanup script — deletes all stale cached recordings so
the backend re-records the actual repo UI on next request.
Run this from the backend directory.
"""
import glob
import os
from pathlib import Path

recordings_dir = Path(__file__).parent / "backend" / "static" / "recordings"
files = list(recordings_dir.glob("*.webm"))
for f in files:
    try:
        f.unlink()
        print(f"Deleted: {f.name}")
    except Exception as e:
        print(f"Failed to delete {f.name}: {e}")
print(f"Done. Deleted {len(files)} cached recording(s).")
