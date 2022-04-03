"""Database Backup

This script saves the state of the database daily.

USE: DAILY CRONJOB
"""

import subprocess
from datetime import date
from pathlib import Path

from common.db.client import DB_CONNECTION_STRING


def create_backup() -> None:
    root_folder = Path().home().joinpath("backups")
    Path(root_folder).mkdir(exist_ok=True)
    today = str(date.today())
    subprocess.run(
        f"mongodump --out={root_folder}/{today} --uri={DB_CONNECTION_STRING}",
        shell=True,
        check=True,
    )


create_backup()
