#!/usr/bin/python3
import subprocess

print("* Create AdminUI Configuration")

subprocess.run(['/usr/lib/linuxmuster-adminui/etc/install_scripts/create_aj_cfg.sh'])

print("* AdminUI Setup Success!")
