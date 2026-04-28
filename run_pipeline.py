import subprocess
import sys
import os

# create output folders up front so every script finds them
os.makedirs("outputs", exist_ok=True)
os.makedirs("models", exist_ok=True)

scripts = [
    "01_data_cleaning.py",
    "02_feature_engineering.py",
    "03_feature_selection.py",
    "04_model_training.py",
    "05_segment_analysis.py"
]

for script in scripts:
    print(f"\n{'='*40}")
    print(f"Running {script}...")
    print(f"{'='*40}")

    result = subprocess.run([sys.executable, script], capture_output=True, text=True)

    print(result.stdout)

    if result.returncode != 0:
        print(f"ERROR in {script}:")
        print(result.stderr)
        print("Pipeline stopped.")
        break
    else:
        print(f"{script} completed successfully")

print("\nPipeline finished.")
print("  Data files  → outputs/")
print("  Model files → models/")
print("  Plots (.png + .html) → outputs/")