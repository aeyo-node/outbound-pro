import subprocess
import sys

def run_cmd(args):
    print(f"[*] Running: {' '.join(args)}")
    try:
        res = subprocess.run(args, capture_output=True, text=True, check=True)
        print("[+] Output:")
        print(res.stdout)
        if res.stderr:
            print("[!] Warnings/Errors:")
            print(res.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"[-] Command failed with exit code {e.returncode}")
        print("[-] Stdout:")
        print(e.stdout)
        print("[-] Stderr:")
        print(e.stderr)
        return False

def main():
    # 1. Status
    run_cmd(["git", "status"])
    
    # 2. Add modified files
    files = ["tools.py", "prompts.py", "data/troubleshoot.py"]
    for f in files:
        run_cmd(["git", "add", f])
        
    # 3. Commit
    commit_msg = "feat: Add EV Charger Troubleshooting & Session Details tools to Susanna assistant"
    run_cmd(["git", "commit", "-m", commit_msg])
    
    # 4. Push
    run_cmd(["git", "push"])

if __name__ == "__main__":
    main()
