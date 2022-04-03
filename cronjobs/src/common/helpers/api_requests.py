from typing import Dict

import requests


def get_json_response_from_get_request(request_url: str) -> Dict:
    response = requests.get(request_url, timeout=20)
    return response.json()
