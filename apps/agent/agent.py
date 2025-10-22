from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent

from tools.describe_image import describe_image
from tools.scene_extractor import get_scene_list
from tools.transcribe import transcribe
from utils.prompts import Prompts
from utils.utils import validate_api_request

app = BedrockAgentCoreApp()

agent = Agent(
    model="us.amazon.nova-pro-v1:0",
    tools=[transcribe, get_scene_list, describe_image],
    system_prompt=Prompts.get_system_prompt(),
)


@app.entrypoint
def invoke(payload):
    """Process user input and return a response"""
    is_valid, message = validate_api_request(payload)

    if not is_valid:
        return {"error": message}

    if payload.get("type") == "regenerate":
        user_message = Prompts.get_regerate_prompt(
            prompt=payload.get("prompt"), s3_url=payload.get("s3_url"),
        )
    else:
        user_message = Prompts.get_new_video_prompt(
            prompt=payload.get("prompt"), s3_url=payload.get("s3_url")
        )

    result = agent(user_message)

    return {"result": result.message}


if __name__ == "__main__":
    print("Starting Bedrock Agent Core App...")
    app.run()

