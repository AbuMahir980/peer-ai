import requests

GEOCODER_URL = "https://geocoder.example.com/v1/search"


def locate(address: str) -> tuple[float, float]:
    response = requests.get(GEOCODER_URL, params={"q": address})
    response.raise_for_status()
    result = response.json()["results"][0]
    return result["lat"], result["lng"]
