import os
import json

# Base directory for error code files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))


# ============================
# OEM → FILE MAPPING
# ============================
OEM_ERROR_MAPPING = {
    "E FUEL": ["E-FUEL.json"],
    "LUBI": ["LUBI60.json","LUBI NEW FIRMWARE.json"],
    "MASSTECH": ["MASSTECH.json"],
    "CAPGO": ["CAPGO.json"],
    "BACONY": ["BACONY ERROR CODE.json"],
    "IRON GRID": ["IRON GRID.json"],
    "EXICOM": ["EXICOM.json"],
    "SIEMENS": ["SIEMENS.json"],
    "DELTA": ["DELTA.json"]
}


def normalize_vendor(vendorId):
    if not vendorId:
        return None
    # Replace common delimiters with space and normalize to uppercase
    return str(vendorId).strip().upper().replace("-", " ").replace("_", " ")

def get_error_files(vendorId):
    vendorId = normalize_vendor(vendorId)
    print(f"[ErrorCodeMapping] Normalized Vendor: {vendorId}")

    files = OEM_ERROR_MAPPING.get(vendorId, [])

    if not files:
        print(f"No mapping found for Vendor: {vendorId}")

    return [os.path.join(BASE_DIR, f) for f in files]


# ============================
# LOAD DATA
# ============================
def load_error_data(vendorId):
    print(f"[ErrorCodeMapping] Loading error data for: {vendorId}")
    file_paths = get_error_files(vendorId)
    all_data = []

    for path in file_paths:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                try:
                    all_data.append(json.load(f))
                except Exception as e:
                    print(f":warning: Error reading {path}: {e}")
        else:
            print(f":warning: File not found: {path}")

    return all_data