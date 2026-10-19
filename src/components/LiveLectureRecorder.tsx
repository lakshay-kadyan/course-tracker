"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

type Props = {
  onRecordingReady: (audio: Blob) => void;
  /** Fires when a new recording starts, so the parent can discard stale audio. */
  onRecordingStart?: () => void;
};

export default function LiveLectureRecorder({ onRecordingReady, onRecordingStart }: Props) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Ready to record");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    setError("");
    setMessage("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access requires HTTPS or localhost.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        setError("Recording failed. Please try again.");
      };

      recorder.onstop = () => {
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });

        // Release temporary chunk references.
        chunksRef.current = [];

        // Stop the physical microphone.
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;

        setRecording(false);

        if (audio.size > 0) {
          setMessage("Recording ready for transcription.");
          onRecordingReady(audio);
        } else {
          setError("No audio was captured.");
        }
      };

      recorder.start();
      onRecordingStart?.();
      setRecording(true);
      setMessage("Recording in progress — microphone is active.");
    } catch (err) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      setRecording(false);
      setError(err instanceof Error ? err.message : "Could not access the microphone.");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      chunksRef.current = [];
    };
  }, []);

  return (
    <section className="space-y-3 rounded-xl border border-dashed border-line bg-black/20 p-5" aria-label="Lecture voice capture">
      <p className="text-xs text-slate-400">
        Record only with the required consent. Audio is held temporarily in browser memory and is not saved or uploaded by this component.
      </p>

      <p aria-live="polite" className="flex items-center gap-2 text-sm text-slate-200">
        <span className={recording ? "h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" : "h-2.5 w-2.5 rounded-full bg-slate-600"} aria-hidden />
        {message}
      </p>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      {!recording ? (
        <button type="button" onClick={startRecording} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-indigo-500 to-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:from-indigo-400 hover:to-violet-500">
          <Mic className="h-4 w-4" />
          Start Listening
        </button>
      ) : (
        <button type="button" onClick={stopRecording} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500">
          <Square className="h-4 w-4" />
          Stop Recording
        </button>
      )}
    </section>
  );
}
