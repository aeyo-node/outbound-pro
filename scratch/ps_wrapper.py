import sys
import subprocess

args = sys.argv[1:]
if args and args[0] == "-Command":
    args = args[1:]
elif args and args[0] == "-ExecutionPolicy":
    if "-Command" in args:
        idx = args.index("-Command")
        args = args[idx+1:]
        
command = " ".join(args)
# Remove outer quotes if present and if it looks like a single command string
if command.startswith('"') and command.endswith('"'):
    command = command[1:-1]

subprocess.run(command, shell=True)
