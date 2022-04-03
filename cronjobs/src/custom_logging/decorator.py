import datetime
from collections import defaultdict
from typing import Callable, Dict, List, Union

from common.db.queries import logs


def mongodb_logging_decorator_factory(script_name: str) -> Callable:
    def decorator(func: Callable) -> Callable:
        return mongdb_logger(script_name, func)

    return decorator


def mongdb_logger(script_name: str, func: Callable) -> Callable:
    log: Dict[str, Union[str, datetime.datetime, Dict]] = {}
    start_time = datetime.datetime.now()
    log["start_time"] = start_time
    log["script_name"] = script_name
    log["status"] = "started"
    log_object = logs.insert_one(log)
    log_id = log_object.inserted_id
    errors: Dict[str, Dict] = defaultdict(dict)

    def wrapper(*args: List, **kwargs: Dict) -> Callable:
        kwargs["errors"] = errors
        wrapped_func = func(*args, **kwargs)
        log["end_time"] = datetime.datetime.utcnow()
        if errors:
            log["errors"] = dict(errors)
            log["status"] = "failed"
        else:
            log["status"] = "finished"
        logs.replace_one({"_id": log_id}, log)
        return wrapped_func

    return wrapper
