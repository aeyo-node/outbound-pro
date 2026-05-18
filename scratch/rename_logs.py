import shutil
import os

src = r"c:\Users\chris\Documents\outbound-pro\data\logs (1).py"
dst = r"c:\Users\chris\Documents\outbound-pro\data\logs.py"

if os.path.exists(src):
    shutil.copy(src, dst)
    print("Successfully copied logs (1).py to logs.py")
else:
    print("Source logs (1).py not found!")
