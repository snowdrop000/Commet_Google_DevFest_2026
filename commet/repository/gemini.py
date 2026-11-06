import json
import re
from urllib.error import URLError
from urllib.request import Request, urlopen

class GeminiUnavailable(Exception):
    pass


def gemini_schema(value):
    # Gemini's JSON Schema subset leaves string lengths to application validation.
    if isinstance(value, dict):
        return {key: gemini_schema(item) for key, item in value.items()
                if key not in {"minLength", "maxLength"}}
    if isinstance(value, list):
        return [gemini_schema(item) for item in value]
    return value


class GeminiRepository:
    def __init__(self, api_key, model):
        if not re.fullmatch(r"gemini-[a-zA-Z0-9.-]+", model):
            raise ValueError("Invalid GEMINI_MODEL")
        self.api_key = api_key
        self.url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    def generate(self, output_model, parts, *, prompt=None, timeout=10):
        payload = {
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 2048,
                "responseMimeType": "application/json",
                "responseJsonSchema": gemini_schema(output_model.model_json_schema()),
            },
        }
        if prompt:
            payload["systemInstruction"] = {"parts": [{"text": prompt}]}
        request = Request(
            self.url, data=json.dumps(payload).encode(), method="POST",
            headers={"Content-Type": "application/json", "x-goog-api-key": self.api_key},
        )
        try:
            with urlopen(request, timeout=timeout) as response:
                result = json.load(response)
            output = result["candidates"][0]["content"]["parts"]
            raw = "".join(part.get("text", "") for part in output if not part.get("thought"))
            return output_model.model_validate_json(raw)
        except (URLError, OSError, KeyError, IndexError, AttributeError, TypeError, ValueError):
            raise GeminiUnavailable("Geminiから有効な判定を取得できませんでした。") from None
