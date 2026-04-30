import subprocess
import sys
import os

os.makedirs("outputs", exist_ok=True)
os.makedirs("models", exist_ok=True)

scripts = [
    "scripts/01_data_cleaning.py",
    "scripts/02_feature_engineering.py",
    "scripts/03_feature_selection.py",
    "scripts/04_model_training.py",
    "scripts/05_segment_analysis.py"
]

for script in scripts:
    print(f"\n{'─' * 45}")
    print(f"  Running {script}")
    print(f"{'─' * 45}")

    result = subprocess.run(
        [sys.executable, script],
        capture_output=True,
        text=True
    )

    print(result.stdout)

    if result.returncode != 0:
        print(f"\nERROR — {script} failed:")
        print(result.stderr)
        print("\nPipeline stopped. Fix the error above and rerun.")
        sys.exit(1)
    else:
        print(f"  ✓ {script} complete")

print(f"\n{'─' * 45}")
print("  Pipeline finished successfully")
print("─" * 45)
print("  Data files  → outputs/")
print("  Model       → models/market_segmentation_model.pkl")
print("  Plots       → outputs/*.png and outputs/*.html")