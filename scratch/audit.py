import re, sys

files = ['agent.py', 'db.py', 'server.py', 'tools.py', 'prompts.py']
patterns = [
    ('gemini model', re.compile(r'gemini-[0-9]', re.IGNORECASE)),
    ('GenerativeModel', re.compile(r'GenerativeModel|google\.generativeai', re.IGNORECASE)),
    ('deepgram', re.compile(r'deepgram', re.IGNORECASE)),
    ('agent_profile_id', re.compile(r'agent_profile_id', re.IGNORECASE)),
    ('campaign_id', re.compile(r'campaign_id', re.IGNORECASE)),
    ('OutboundAssistant', re.compile(r'OutboundAssistant', re.IGNORECASE)),
    ('DEFAULT_SYSTEM', re.compile(r'DEFAULT_SYSTEM_PROMPT|DEFAULT_PROMPT', re.IGNORECASE)),
    ('hardcoded voice', re.compile(r'"Zephyr"|"Charon"|"Aoede"|"Kore"|"Puck"', re.IGNORECASE)),
    ('build_prompt', re.compile(r'build_prompt', re.IGNORECASE)),
    ('REALTIME_MODEL const', re.compile(r'REALTIME_MODEL', re.IGNORECASE)),
]

for f in files:
    try:
        lines = open(f, encoding='utf-8').readlines()
    except:
        print(f"  MISSING: {f}")
        continue
    for name, pat in patterns:
        hits = [(i+1, l.rstrip()) for i,l in enumerate(lines) if pat.search(l)]
        if hits:
            print(f"\n=== {f} | {name} ===")
            for lineno, text in hits:
                print(f"  {lineno}: {text}")
