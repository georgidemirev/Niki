f = open("deployment.config", "r")
target = int(f.read())
f.close()

import subprocess
import sys

if target == 0:
    folder_server = '../server_0'
else:
    folder_server = '../server_1'


npm_install = subprocess.Popen(['sudo', 'npm', 'install'],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT)

stdout,stderr = npm_install.communicate()

if stderr:
    print("Error while server npm_install")
    sys.exit(0)
else:
    print("Server Node modules installed")

server_clean = subprocess.Popen(['rm', '-rf', folder_server],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT)

stdout,stderr = server_clean.communicate()

if stderr:
    print("Error while removing folder")
    sys.exit(0)
else:
    print("Server Folder removed")

server_make_dir = subprocess.Popen(['mkdir', folder_server],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT)

stdout,stderr = server_make_dir.communicate()

if stderr:
    print("Error while creating folder")
    sys.exit(0)
else:
    print("Server Folder created")


copy_routes = subprocess.Popen(['cp', '-R', 'routes' , folder_server],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT)

stdout,stderr = copy_routes.communicate()

if stderr:
    print("Error while copying routes")
    sys.exit(0)
else:
    print("Routes copied")


copy_config = subprocess.Popen(['cp', '-R', 'config' , folder_server],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT)

stdout,stderr = copy_config.communicate()

if stderr:
    print("Error while copying config")
    sys.exit(0)
else:
    print("Config copied")

copy_models = subprocess.Popen(['cp', '-R', 'models' , folder_server],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT)

stdout,stderr = copy_models.communicate()

if stderr:
    print("Error while copying models")
    sys.exit(0)
else:
    print("Models copied")

copy_global = subprocess.Popen(['cp', '-R', 'services' , folder_server],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT)

stdout,stderr = copy_global.communicate()

if stderr:
    print("Error while copying services")
    sys.exit(0)
else:
    print("Services copied")

copy_scripts = subprocess.Popen(['cp', '-R', 'scripts' , folder_server],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT)

stdout,stderr = copy_scripts.communicate()

if stderr:
    print("Error while copying scripts folder")
    sys.exit(0)
else:
    print("Scripts copied")


copy_server = subprocess.Popen(['cp', 'server.js' , folder_server],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT)

stdout,stderr = copy_server.communicate()

if stderr:
    print("Error while copying server")
    sys.exit(0)
else:
    print("Server copied")


copy_node = subprocess.Popen(['cp', '-R', 'node_modules' , folder_server],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT)

stdout,stderr = copy_node.communicate()

if stderr:
    print("Error while copying server node_modules")
    sys.exit(0)
else:
    print("Server Node modules copied")


copy_package_server = subprocess.Popen(['cp', 'package.json' , folder_server],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT)

stdout,stderr = copy_package_server.communicate()

if stderr:
    print("Error while copying server package.json")
    sys.exit(0)
else:
    print("Server Package.json copied")


if target == 0:
    stop_server = subprocess.Popen(['pm2', 'stop', 'server_1'],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT)

    stdout,stderr = stop_server.communicate()

    if stderr:
        print("Error stopping the server")
        sys.exit(0)
    else:
        print("Stopping the server successful")

    start_server = subprocess.Popen(['pm2', 'start', '-i', 'max', 'npm', '--name', 'server_0', '--', 'start'], cwd=folder_server,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT)

    stdout,stderr = start_server.communicate()

    if stderr:
        print("Error starting the server")
        sys.exit(0)
    else:
        print("Starting the server successful")


    delete_server = subprocess.Popen(['pm2', 'delete', 'server_1'],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT)

    stdout,stderr = delete_server.communicate()

    if stderr:
        print("Error deleting the server")
        sys.exit(0)
    else:
        print("Deleting the server successful")

    f = open("deployment.config", "w")
    f.write("1")
    f.close()

else:
    stop_server = subprocess.Popen(['pm2', 'stop', 'server_0'],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT)

    stdout,stderr = stop_server.communicate()

    if stderr:
        print("Error stopping the server")
        sys.exit(0)
    else:
        print("Stopping the server successful")

    start_server = subprocess.Popen(['pm2', 'start', '-i', 'max', 'npm', '--name', 'server_1', '--', 'start'], cwd=folder_server,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT)

    stdout,stderr = start_server.communicate()

    if stderr:
        print("Error starting the server")
        sys.exit(0)
    else:
        print("Starting the server successful")


    delete_server = subprocess.Popen(['pm2', 'delete', 'server_0'],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT)

    stdout,stderr = delete_server.communicate()

    if stderr:
        print("Error deleting the server")
        sys.exit(0)
    else:
        print("Deleting the server successful")

    f = open("deployment.config", "w")
    f.write("0")
    f.close()
