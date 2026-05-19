import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from data.troubleshoot import lookup_error_code, get_error_details, load_ac_error_codes

print("AC error codes length:", len(load_ac_error_codes()))
print("get_error_details('1009'):", get_error_details("1009"))
print("lookup_error_code('1009', vendor_id='Delta', charger_type='AC'):", lookup_error_code("1009", vendor_id="Delta", charger_type="AC"))
