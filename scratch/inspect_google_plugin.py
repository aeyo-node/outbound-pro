import sys
from livekit.plugins import google
print("google plugin dir:", dir(google))
if hasattr(google, "realtime"):
    print("google.realtime dir:", dir(google.realtime))
if hasattr(google, "beta"):
    print("google.beta dir:", dir(google.beta))
    if hasattr(google.beta, "realtime"):
        print("google.beta.realtime dir:", dir(google.beta.realtime))
