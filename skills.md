# Antigravity Skills Installation Guide

To make sure that all the necessary advanced skills (from `rmyndharis/antigravity-skills`) are available globally for **every** future project you create, you need to clone them directly into Antigravity's global skills directory.

### Global Installation Command

Open a new PowerShell or Command Prompt window and run the following commands:

```powershell
# 1. Navigate to your global Antigravity configuration folder
cd C:\Users\chris\.gemini\antigravity

# 2. Back up the default skills folder just in case
Rename-Item -Path "skills" -NewName "skills_backup"

# 3. Clone the new advanced skills repository directly into the "skills" folder
git clone https://github.com/rmyndharis/antigravity-skills.git skills
```

### Why do this globally?
By placing the repository exactly at `C:\Users\chris\.gemini\antigravity\skills`, you ensure that **every time you start vibe coding** in any new folder, Antigravity will automatically load all the specialized agent tools, frameworks, and workflows (such as advanced Python, Next.js, and LiveKit handling) without you needing to manually configure them per-project!
