(* ============================================================================ *)
(* 01-audio-import.wl                                                         *)
(* Chromesthesia Analysis Pipeline - Audio Import & Normalization              *)
(*                                                                            *)
(* Imports Daniel Caesar audio files, normalizes sample rate to 44100 Hz,     *)
(* trims silence from start/end, and exports normalized audio metadata.       *)
(* ============================================================================ *)

(* -------------------------------------------------------------------------- *)
(* Configuration                                                              *)
(* -------------------------------------------------------------------------- *)

$projectRoot = FileNameJoin[{DirectoryName[$InputFileName], ".."}];
$audioInputDir = FileNameJoin[{$projectRoot, "audio", "raw"}];
$audioOutputDir = FileNameJoin[{$projectRoot, "audio", "normalized"}];
$targetSampleRate = 44100;
$silenceThreshold = 0.01;  (* RMS threshold below which we consider silence *)
$silenceWindowSamples = 2048; (* Window size for silence detection *)

(* -------------------------------------------------------------------------- *)
(* Ensure output directory exists                                             *)
(* -------------------------------------------------------------------------- *)

If[!DirectoryQ[$audioOutputDir],
  CreateDirectory[$audioOutputDir];
  Print["Created output directory: ", $audioOutputDir];
];

(* -------------------------------------------------------------------------- *)
(* Helper: Trim silence from start and end of audio samples                   *)
(* -------------------------------------------------------------------------- *)

trimSilence[samples_List, threshold_: $silenceThreshold, windowSize_: $silenceWindowSamples] :=
  Module[{n = Length[samples], startIdx = 1, endIdx, rms},
    endIdx = n;

    (* Find start: advance until RMS exceeds threshold *)
    While[startIdx + windowSize <= n,
      rms = RootMeanSquare[samples[[startIdx ;; startIdx + windowSize - 1]]];
      If[rms > threshold, Break[]];
      startIdx += windowSize;
    ];

    (* Find end: retreat until RMS exceeds threshold *)
    While[endIdx - windowSize >= 1,
      rms = RootMeanSquare[samples[[endIdx - windowSize + 1 ;; endIdx]]];
      If[rms > threshold, Break[]];
      endIdx -= windowSize;
    ];

    (* Clamp indices *)
    startIdx = Max[1, startIdx - windowSize]; (* Keep a tiny buffer *)
    endIdx = Min[n, endIdx + windowSize];

    samples[[startIdx ;; endIdx]]
  ];

(* -------------------------------------------------------------------------- *)
(* Helper: Normalize sample rate via resampling                               *)
(* -------------------------------------------------------------------------- *)

normalizeSampleRate[audioObj_Audio, targetRate_Integer] :=
  Module[{currentRate},
    currentRate = audioObj["SampleRate"];
    If[currentRate === targetRate,
      audioObj,
      AudioResample[audioObj, targetRate]
    ]
  ];

(* -------------------------------------------------------------------------- *)
(* Discover audio files                                                       *)
(* -------------------------------------------------------------------------- *)

$supportedExtensions = {"wav", "mp3", "flac", "aiff", "m4a", "ogg"};

audioFiles = Flatten[
  FileNames["*." <> # , $audioInputDir, Infinity] & /@ $supportedExtensions
];

If[Length[audioFiles] === 0,
  Print["ERROR: No audio files found in ", $audioInputDir];
  Print["Expected directory structure:"];
  Print["  audio/raw/<album-slug>/<song-slug>.<ext>"];
  Print["Supported formats: ", StringRiffle[$supportedExtensions, ", "]];
  Abort[];
];

Print["Found ", Length[audioFiles], " audio file(s) in ", $audioInputDir];

(* -------------------------------------------------------------------------- *)
(* Process each audio file                                                    *)
(* -------------------------------------------------------------------------- *)

processedInfo = {};

Do[
  Module[{fileName, relPath, audio, normalized, samples, trimmed,
          trimmedAudio, outPath, info, duration, albumSlug, songSlug, parts},

    fileName = FileNameTake[file];
    relPath = FileNameDrop[file, FileNameDepth[$audioInputDir]];
    parts = FileNameSplit[relPath];

    (* Expect structure: <album-slug>/<song-slug>.<ext> *)
    If[Length[parts] < 2,
      Print["WARNING: Skipping ", file, " (expected album/song structure)"];
      Continue[];
    ];

    albumSlug = parts[[-2]];
    songSlug = FileBaseName[parts[[-1]]];

    Print["Processing: ", albumSlug, "/", songSlug, " ..."];

    (* Import audio *)
    audio = Quiet[Import[file, "Audio"]];
    If[!AudioQ[audio],
      Print["  ERROR: Could not import ", file, ". Skipping."];
      Continue[];
    ];

    (* Normalize sample rate *)
    normalized = normalizeSampleRate[audio, $targetSampleRate];

    (* Convert to mono if stereo, for analysis purposes *)
    If[AudioChannels[normalized] > 1,
      normalized = AudioChannelMix[normalized, "Mono"];
    ];

    (* Extract samples, trim silence *)
    samples = Flatten[AudioData[normalized]];
    trimmed = trimSilence[samples];

    (* Reconstruct Audio object *)
    trimmedAudio = Audio[{trimmed}, SampleRate -> $targetSampleRate];
    duration = Length[trimmed] / $targetSampleRate // N;

    (* Export normalized audio *)
    outPath = FileNameJoin[{$audioOutputDir, albumSlug}];
    If[!DirectoryQ[outPath], CreateDirectory[outPath]];
    outPath = FileNameJoin[{outPath, songSlug <> ".wav"}];

    Export[outPath, trimmedAudio, "WAV"];

    info = <|
      "albumSlug" -> albumSlug,
      "songSlug" -> songSlug,
      "originalFile" -> file,
      "normalizedFile" -> outPath,
      "sampleRate" -> $targetSampleRate,
      "duration" -> duration,
      "samples" -> Length[trimmed]
    |>;

    AppendTo[processedInfo, info];
    Print["  Done: ", Round[duration, 0.01], "s, exported to ", outPath];
  ],
  {file, audioFiles}
];

(* -------------------------------------------------------------------------- *)
(* Export processing summary                                                  *)
(* -------------------------------------------------------------------------- *)

summaryPath = FileNameJoin[{$audioOutputDir, "import-summary.json"}];
Export[summaryPath, processedInfo, "JSON"];
Print["\nImport summary written to: ", summaryPath];
Print["Total files processed: ", Length[processedInfo]];
