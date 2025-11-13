import asyncio
import json
import time
import wave
from pathlib import Path
from typing import Optional
import websockets
import pyaudio
from websockets.exceptions import ConnectionClosed

SERVER_URL = "ws://localhost:8000/ws/music"
TEST_DURATION = 10
OUTPUT_DIR = Path("test_output")

BUFFER_SECONDS = 1
CHUNK = 4200
FORMAT = pyaudio.paInt16
CHANNELS = 2
MODEL = "models/lyria-realtime-exp"
OUTPUT_RATE = 48000
SAMPLE_WIDTH = 2


class AudioStreamTester:
    def __init__(self):
        self.audio_data = []
        self.start_time = None

        OUTPUT_DIR.mkdir(exist_ok=True)

    async def test_audio_stream(
        self, prompt: str, bpm: int, scale: str = "MAJOR", weight: float = 1.0
    ):

        print("Testing audio stream with:")
        print(f"   Prompt: {prompt}")
        print(f"   BPM: {bpm}")
        print(f"   Scale: {scale}")
        print(f"   Weight: {weight}")
        print(f"   Duration: {TEST_DURATION} seconds")
        print(f"   Server: {SERVER_URL}")

        try:
            async with websockets.connect(SERVER_URL) as websocket:
                print("Connected to WebSocket server")

                config_message = {
                    "prompt": prompt,
                    "bpm": bpm,
                    "scale": scale,
                    "weight": weight,
                }

                await websocket.send(json.dumps(config_message))
                print("Sent configuration to server")

                self.start_time = time.time()

                try:
                    while True:
                        elapsed = time.time() - self.start_time
                        if elapsed >= TEST_DURATION:
                            print(f"Test duration ({TEST_DURATION}s) reached")
                            break

                        try:
                            data = await asyncio.wait_for(websocket.recv(), timeout=1.0)

                            if isinstance(data, bytes):
                                self.audio_data.append(data)

                                print(
                                    f"Received audio chunk ({len(data)} bytes) - "
                                    f"Total time: {elapsed:.1f}s",
                                    end="\r",
                                )
                            else:
                                print(f"\nReceived message: {data}")

                        except asyncio.TimeoutError:
                            print(
                                f"\nWarning: No data received for 1 second (elapsed: {elapsed:.1f}s)"
                            )
                            continue

                except ConnectionClosed:
                    print("\nWebSocket connection closed by server")

                try:
                    stop_command = {"command": "STOP"}
                    await websocket.send(json.dumps(stop_command))
                    print("\nSent STOP command")
                except:
                    pass

        except ConnectionError:
            print("Error: Failed to connect to server. Is the server running?")
            return False
        except Exception as e:
            print(f"Error during test: {e}")
            return False

        return True

    def save_audio_as_wav(self, filename: Optional[str] = None):
        """Save collected audio data as a WAV file."""
        if not self.audio_data:
            print("Warning: No audio data to save")
            return None

        if filename is None:
            timestamp = int(time.time())
            filename = f"test_audio_{timestamp}.wav"

        filepath = OUTPUT_DIR / filename

        try:
            with wave.open(str(filepath), "wb") as wav_file:
                wav_file.setnchannels(CHANNELS)
                wav_file.setsampwidth(SAMPLE_WIDTH)
                wav_file.setframerate(OUTPUT_RATE)

                # Combine all audio chunks
                combined_audio = b"".join(self.audio_data)
                wav_file.writeframes(combined_audio)

            file_size = filepath.stat().st_size
            duration = len(combined_audio) / (OUTPUT_RATE * CHANNELS * SAMPLE_WIDTH)

            print(f"Saved audio to: {filepath}")
            print(f"File size: {file_size:,} bytes")
            print(f"Duration: {duration:.2f} seconds")
            print(f"Sample rate: {OUTPUT_RATE} Hz")

            return filepath

        except Exception as e:
            print(f"Error saving audio: {e}")
            return None


async def run_basic_test():
    """Run a basic test with default parameters."""
    print("Starting basic audio stream test...")

    tester = AudioStreamTester()

    success = await tester.test_audio_stream(
        prompt="rock", bpm=90, scale="C_MAJOR_A_MINOR", weight=1.0
    )

    if success:
        tester.save_audio_as_wav()


if __name__ == "__main__":
    asyncio.run(run_basic_test())
