def validate_api_request(payload, required_keys = ["type", "prompt", "s3_url"]):
    for key in required_keys:
        if key not in payload:
            return False, f"Missing required key: {key}"
    return True, "Valid request"