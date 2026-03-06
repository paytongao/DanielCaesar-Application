(* ============================================================================ *)
(* 02-spectral-analysis.wl                                                    *)
(* Chromesthesia Analysis Pipeline - Spectral Analysis                        *)
(*                                                                            *)
(* Runs SpectrogramArray on each normalized audio file, extracts frequency    *)
(* magnitude data, downsamples to 128x128 grids, and exports as JSON.        *)
(* ============================================================================ *)

(* -------------------------------------------------------------------------- *)
(* Configuration                                                              *)
(* -------------------------------------------------------------------------- *)

$projectRoot = FileNameJoin[{DirectoryName[$InputFileName], ".."}];
$audioDir = FileNameJoin[{$projectRoot, "audio", "normalized"}];
$outputBaseDir = FileNameJoin[{$projectRoot, "public", "data", "atlas"}];
$targetGridRows = 128; (* frequency bins after downsampling *)
$targetGridCols = 128; (* time frames after downsampling *)
$fftSize = 2048;
$hopSize = 512;

(* -------------------------------------------------------------------------- *)
(* Ensure output directories exist                                            *)
(* -------------------------------------------------------------------------- *)

If[!DirectoryQ[$outputBaseDir],
  CreateDirectory[$outputBaseDir];
];

(* -------------------------------------------------------------------------- *)
(* Load import summary to discover processed files                            *)
(* -------------------------------------------------------------------------- *)

$summaryPath = FileNameJoin[{$audioDir, "import-summary.json"}];

If[!FileExistsQ[$summaryPath],
  Print["ERROR: Import summary not found at ", $summaryPath];
  Print["Run 01-audio-import.wl first."];
  Abort[];
];

processedFiles = Import[$summaryPath, "JSON"];
Print["Loaded import summary: ", Length[processedFiles], " file(s)"];

(* -------------------------------------------------------------------------- *)
(* Helper: Downsample a 2D array to target dimensions                         *)
(* -------------------------------------------------------------------------- *)

downsample2D[data_List, targetRows_Integer, targetCols_Integer] :=
  Module[{rows, cols, rowStep, colStep, result, rIdx, cIdx},
    rows = Length[data];
    cols = Length[data[[1]]];

    If[rows <= targetRows && cols <= targetCols, Return[data]];

    rowStep = rows / targetRows // N;
    colStep = cols / targetCols // N;

    Table[
      rIdx = Ceiling[r * rowStep];
      cIdx = Ceiling[c * colStep];
      rIdx = Clip[rIdx, {1, rows}];
      cIdx = Clip[cIdx, {1, cols}];
      data[[rIdx, cIdx]],
      {r, targetRows}, {c, targetCols}
    ]
  ];

(* -------------------------------------------------------------------------- *)
(* Process each audio file                                                    *)
(* -------------------------------------------------------------------------- *)

Do[
  Module[{albumSlug, songSlug, audioPath, audio, specData,
          downsampled, duration, outDir, outPath, jsonData},

    albumSlug = entry["albumSlug"];
    songSlug = entry["songSlug"];
    audioPath = entry["normalizedFile"];
    duration = entry["duration"];

    If[!FileExistsQ[audioPath],
      Print["WARNING: Normalized audio not found: ", audioPath, ". Skipping."];
      Continue[];
    ];

    Print["Spectral analysis: ", albumSlug, "/", songSlug, " ..."];

    (* Import audio *)
    audio = Import[audioPath, "Audio"];

    (* Compute spectrogram array: returns magnitude matrix *)
    (* Rows = frequency bins, Columns = time frames *)
    specData = SpectrogramArray[audio, $fftSize, $hopSize];

    (* Take magnitude (SpectrogramArray may return complex values) *)
    specData = Abs[specData];

    Print["  Raw spectrogram: ", Dimensions[specData]];

    (* Downsample to target grid size *)
    downsampled = downsample2D[specData, $targetGridRows, $targetGridCols];

    Print["  Downsampled to: ", Dimensions[downsampled]];

    (* Build JSON payload matching SpectralData interface *)
    jsonData = <|
      "frequencyBins" -> downsampled,
      "sampleRate" -> 44100,
      "fftSize" -> $fftSize,
      "hopSize" -> $hopSize,
      "duration" -> duration
    |>;

    (* Export to public/data/atlas/<album>/ songs/<song>.json *)
    outDir = FileNameJoin[{$outputBaseDir, albumSlug, "songs"}];
    If[!DirectoryQ[outDir], CreateDirectory[outDir]];

    outPath = FileNameJoin[{outDir, songSlug <> ".json"}];
    Export[outPath, jsonData, "JSON"];

    Print["  Exported: ", outPath];
  ],
  {entry, processedFiles}
];

Print["\nSpectral analysis complete."];
