export function processAudioChunk(audioContext: AudioContext, arrayBuffer: ArrayBuffer): AudioBuffer {
    const int16Data = new Int16Array(arrayBuffer);
    const float32Data = new Float32Array(int16Data.length);

    // Convert Int16 to Float32
    for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i]! / 32768.0;
    }

    // Create AudioBuffer
    // 2 channels, length is total samples / channels
    const channels = 2;
    const frameCount = float32Data.length / channels;
    const audioBuffer = audioContext.createBuffer(
        channels,
        frameCount,
        48000
    );

    // De-interleave
    for (let channel = 0; channel < channels; channel++) {
        const nowBuffering = audioBuffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            const sampleIndex = i * channels + channel;
            if (sampleIndex < float32Data.length) {
                nowBuffering[i] = float32Data[sampleIndex]!;
            } else {
                nowBuffering[i] = 0; // Silence if out of bounds
            }
        }
    }

    return audioBuffer;
}
