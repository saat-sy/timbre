import subprocess

def _combine_video_audio(video_file, audio_files, output_file):
    filter_complex = []
    input_args = ["-i", video_file]
    
    for i, audio in enumerate(audio_files):
        input_args.extend(["-i", audio["file"]])
        duration = audio["end"] - audio["start"]
        delay = int(audio["start"] * 1000)
        
        fade_duration = 0.5
        filter_complex.append(f"[{i+1}:a]volume=-25dB,afade=t=in:ss=0:d={fade_duration},afade=t=out:st={duration-fade_duration}:d={fade_duration},adelay={delay}|{delay}[delayed{i}]")
    
    if audio_files:
        if len(audio_files) > 1:
            mix_inputs = "".join([f"[delayed{i}]" for i in range(len(audio_files))])
            filter_complex.append(f"{mix_inputs}amix=inputs={len(audio_files)}:duration=longest[new_audio]")
            new_audio_stream = "[new_audio]"
        else:
            new_audio_stream = "[delayed0]"
        
        filter_complex.append(f"[0:a]{new_audio_stream}amix=inputs=2:duration=longest[final_audio]")
        
        cmd = [
            'ffmpeg', "-y"
        ] + input_args + [
            "-filter_complex", ";".join(filter_complex),
            "-map", "0:v",
            "-map", "[final_audio]",
            "-c:v", "copy",
            "-c:a", "aac",
            output_file
        ]
    else:
        cmd = [
            'ffmpeg', "-y",
            "-i", video_file,
            "-c", "copy",
            output_file
        ]
    
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    if result.returncode != 0:
        raise Exception(f"FFmpeg failed with return code {result.returncode}: {result.stderr}")
    if result.stderr and "error" in result.stderr.lower():
        pass

if __name__ == "__main__":
    # For local testing, you can simulate an event here
    _combine_video_audio("test.mp4", [{"file": "sample_006.mp3", "start": 11.77, "end": 42.23}], "output.mp4")