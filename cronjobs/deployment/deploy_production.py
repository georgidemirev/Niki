import argparse
import json
import os

from pexpect import pxssh

parser = argparse.ArgumentParser()
parser.add_argument('-merge', default=True, type=bool)
args = parser.parse_args()

def main():
    with open('config.json') as json_file:
        data = json.load(json_file)
        
    try:
        if args.merge:
            os.system("cd ../..")
            os.system("git checkout master")
            os.system("git merge test --no-edit")
            os.system("git push")

        s = pxssh.pxssh()
        s.login("app.influ.ai", "root", data["key_password"])
        s.sendline('cd influ-ai-platform')
        s.prompt()
        print("Connected")
        s.sendline('git pull')
        s.expect("Username.*")
        s.sendline(data["git_username"])
        s.expect("Password.*")
        s.sendline(data["git_password"])
        s.prompt()
        print("Pulled")
        s.sendline("cd server/")
        s.prompt()
        s.sendline("python3 deployment.py")
        s.prompt()
        print("Production Server Deployed")
        s.sendline("cd ../client")
        s.prompt()
        s.sendline("python3 deployment.py")
        s.prompt(timeout=600)
        print("Production Client Deployed")
        s.logout()
    except pxssh.ExceptionPxssh as e:
        print("pxssh failed on login.")
        print(e)
        
if __name__ == "__main__":
    main()