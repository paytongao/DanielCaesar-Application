(* ============================================================================ *)
(* 07-contrast-analysis.wl                                                    *)
(* Chromesthesia Analysis Pipeline - Contrast Analysis                        *)
(*                                                                            *)
(* Loads both versions of "Won't Live Here" (released vs unreleased),         *)
(* computes spectral difference, generates comparison visualizations, and     *)
(* exports diff.json matching the ContrastDiff interface: {diff, maxDiff}.    *)
(* Also exports individual version JSON files for the web app.               *)
(* ============================================================================ *)

(* -------------------------------------------------------------------------- *)
(* Configuration                                                              *)
(* -------------------------------------------------------------------------- *)

$projectRoot = FileNameJoin[{DirectoryName[$InputFileName], ".."}];
$audioDir = FileNameJoin[{$projectRoot, "audio", "normalized"}];
$outputDir = FileNameJoin[{$projectRoot, "public", "data", "contrast"}];
$gridRows = 128;
$gridCols = 128;
$fftSize = 2048;
$hopSize = 512;
$imageWidth = 1024;
$imageHeight = 512;

(* -------------------------------------------------------------------------- *)
(* Ensure output directory exists                                             *)
(* -------------------------------------------------------------------------- *)

If[!DirectoryQ[$outputDir],
  CreateDirectory[$outputDir];
];

(* -------------------------------------------------------------------------- *)
(* Helper: Find audio file for a version                                      *)
(* -------------------------------------------------------------------------- *)

findAudioFile[pattern_String] :=
  Module[{matches},
    matches = FileNames[pattern, $audioDir, Infinity];
    If[Length[matches] > 0, First[matches], None]
  ];

(* -------------------------------------------------------------------------- *)
(* Helper: Downsample 2D array                                                *)
(* -------------------------------------------------------------------------- *)

downsample2D[data_List, targetRows_Integer, targetCols_Integer] :=
  Module[{rows, cols, rowStep, colStep, rIdx, cIdx},
    rows = Length[data];
    cols = Length[data[[1]]];
    If[rows <= targetRows && cols <= targetCols, Return[data]];
    rowStep = rows / targetRows // N;
    colStep = cols / targetCols // N;
    Table[
      rIdx = Clip[Ceiling[r * rowStep], {1, rows}];
      cIdx = Clip[Ceiling[c * colStep], {1, cols}];
      data[[rIdx, cIdx]],
      {r, targetRows}, {c, targetCols}
    ]
  ];

(* -------------------------------------------------------------------------- *)
(* Locate audio files                                                         *)
(* -------------------------------------------------------------------------- *)

releasedPath = findAudioFile["wont-live-here.wav"];
unreleasedPath = findAudioFile["wont-live-here-unreleased.wav"];

If[releasedPath === None,
  Print["ERROR: Released version of 'Won't Live Here' not found."];
  Print["Expected: audio/normalized/<album>/wont-live-here.wav"];
  Abort[];
];

If[unreleasedPath === None,
  Print["ERROR: Unreleased version of 'Won't Live Here' not found."];
  Print["Expected: audio/normalized/<album>/wont-live-here-unreleased.wav"];
  Abort[];
];

Print["Released audio: ", releasedPath];
Print["Unreleased audio: ", unreleasedPath];

(* -------------------------------------------------------------------------- *)
(* Compute spectral data for both versions                                    *)
(* -------------------------------------------------------------------------- *)

processVersion[audioPath_String, label_String] :=
  Module[{audio, specData, downsampled, duration, jsonData},

    Print["\nProcessing ", label, " version ..."];

    audio = Import[audioPath, "Audio"];
    duration = AudioLength[audio] // N;

    specData = Abs[SpectrogramArray[audio, $fftSize, $hopSize]];
    Print["  Raw spectrogram: ", Dimensions[specData]];

    downsampled = downsample2D[specData, $gridRows, $gridCols];
    Print["  Downsampled to: ", Dimensions[downsampled]];

    (* Build VersionData JSON *)
    jsonData = <|
      "frequencyBins" -> downsampled,
      "sampleRate" -> 44100,
      "fftSize" -> $fftSize,
      "hopSize" -> $hopSize,
      "duration" -> duration
    |>;

    (* Export individual version file *)
    Export[FileNameJoin[{$outputDir, label <> ".json"}], jsonData, "JSON"];
    Print["  Exported: ", label, ".json"];

    downsampled
  ];

releasedSpec = processVersion[releasedPath, "released"];
unreleasedSpec = processVersion[unreleasedPath, "unreleased"];

(* -------------------------------------------------------------------------- *)
(* Compute spectral difference                                                *)
(* -------------------------------------------------------------------------- *)

Print["\nComputing spectral difference ..."];

(* Ensure both matrices have the same dimensions *)
{rows1, cols1} = Dimensions[releasedSpec];
{rows2, cols2} = Dimensions[unreleasedSpec];
commonRows = Min[rows1, rows2];
commonCols = Min[cols1, cols2];

relTrimmed = releasedSpec[[1 ;; commonRows, 1 ;; commonCols]];
unrelTrimmed = unreleasedSpec[[1 ;; commonRows, 1 ;; commonCols]];

(* Absolute difference *)
diffMatrix = Abs[relTrimmed - unrelTrimmed] // N;
maxDiff = Max[Flatten[diffMatrix]];

Print["  Diff dimensions: ", Dimensions[diffMatrix]];
Print["  Max difference: ", maxDiff];

(* Build ContrastDiff JSON *)
diffData = <|
  "diff" -> diffMatrix,
  "maxDiff" -> maxDiff
|>;

Export[FileNameJoin[{$outputDir, "diff.json"}], diffData, "JSON"];
Print["  Exported: diff.json"];

(* -------------------------------------------------------------------------- *)
(* Generate side-by-side comparison visualization                             *)
(* -------------------------------------------------------------------------- *)

Print["\nGenerating comparison visualizations ..."];

(* Released heatmap *)
releasedAudio = Import[releasedPath, "Audio"];
releasedPlot = Spectrogram[releasedAudio, $fftSize, $hopSize,
  BlackmanHarrisWindow,
  ColorFunction -> "SunsetColors",
  Frame -> False,
  FrameTicks -> None,
  PlotRangePadding -> None,
  ImageSize -> {$imageWidth, $imageHeight}
];
Export[FileNameJoin[{$outputDir, "released-heatmap.png"}], releasedPlot, "PNG",
  ImageResolution -> 144];
Print["  Exported: released-heatmap.png"];

(* Unreleased heatmap *)
unreleasedAudio = Import[unreleasedPath, "Audio"];
unreleasedPlot = Spectrogram[unreleasedAudio, $fftSize, $hopSize,
  BlackmanHarrisWindow,
  ColorFunction -> "GrayTones",
  Frame -> False,
  FrameTicks -> None,
  PlotRangePadding -> None,
  ImageSize -> {$imageWidth, $imageHeight}
];
Export[FileNameJoin[{$outputDir, "unreleased-heatmap.png"}], unreleasedPlot, "PNG",
  ImageResolution -> 144];
Print["  Exported: unreleased-heatmap.png"];

(* Difference heatmap *)
diffPlot = MatrixPlot[diffMatrix,
  ColorFunction -> "TemperatureMap",
  Frame -> False,
  FrameTicks -> None,
  PlotRangePadding -> None,
  ImageSize -> {$imageWidth, $imageHeight}
];
Export[FileNameJoin[{$outputDir, "diff-heatmap.png"}], diffPlot, "PNG",
  ImageResolution -> 144];
Print["  Exported: diff-heatmap.png"];

(* Side-by-side composite *)
sideBySide = GraphicsRow[{releasedPlot, unreleasedPlot},
  Spacings -> 0,
  ImageSize -> {$imageWidth * 2, $imageHeight}
];
Export[FileNameJoin[{$outputDir, "comparison.png"}], sideBySide, "PNG",
  ImageResolution -> 144];
Print["  Exported: comparison.png"];

Print["\nContrast analysis complete."];
