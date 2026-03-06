(* ============================================================================ *)
(* 04-heatmap-generation.wl                                                   *)
(* Chromesthesia Analysis Pipeline - Spectrogram Heatmap Generation           *)
(*                                                                            *)
(* Generates spectrogram plots for each song using custom color functions:    *)
(*   - SunsetColors for released tracks                                       *)
(*   - GrayTones for unreleased tracks                                        *)
(* Exports as PNG files at 1024x512 resolution.                              *)
(* ============================================================================ *)

(* -------------------------------------------------------------------------- *)
(* Configuration                                                              *)
(* -------------------------------------------------------------------------- *)

$projectRoot = FileNameJoin[{DirectoryName[$InputFileName], ".."}];
$audioDir = FileNameJoin[{$projectRoot, "audio", "normalized"}];
$outputBaseDir = FileNameJoin[{$projectRoot, "public", "data", "atlas"}];
$contrastOutputDir = FileNameJoin[{$projectRoot, "public", "data", "contrast"}];
$fftSize = 2048;
$hopSize = 512;
$imageWidth = 1024;
$imageHeight = 512;

(* Define which albums/songs are "unreleased" and should use GrayTones *)
(* Add slug patterns here for unreleased content *)
$unreleasedSlugs = {"unreleased", "wont-live-here-unreleased"};

(* -------------------------------------------------------------------------- *)
(* Helper: Determine color function for a given album/song slug               *)
(* -------------------------------------------------------------------------- *)

getColorFunction[albumSlug_String, songSlug_String] :=
  If[MemberQ[$unreleasedSlugs, albumSlug] || MemberQ[$unreleasedSlugs, songSlug],
    "GrayTones",
    "SunsetColors"
  ];

(* -------------------------------------------------------------------------- *)
(* Load import summary                                                        *)
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
(* Ensure output directories exist                                            *)
(* -------------------------------------------------------------------------- *)

If[!DirectoryQ[$contrastOutputDir],
  CreateDirectory[$contrastOutputDir];
];

(* -------------------------------------------------------------------------- *)
(* Process each audio file                                                    *)
(* -------------------------------------------------------------------------- *)

Do[
  Module[{albumSlug, songSlug, audioPath, audio, colorFunc,
          spectrogramPlot, outDir, outPath, isContrast},

    albumSlug = entry["albumSlug"];
    songSlug = entry["songSlug"];
    audioPath = entry["normalizedFile"];

    If[!FileExistsQ[audioPath],
      Print["WARNING: Audio not found: ", audioPath, ". Skipping."];
      Continue[];
    ];

    Print["Generating heatmap: ", albumSlug, "/", songSlug, " ..."];

    (* Import audio *)
    audio = Import[audioPath, "Audio"];

    (* Determine color scheme *)
    colorFunc = getColorFunction[albumSlug, songSlug];
    Print["  Color function: ", colorFunc];

    (* Generate spectrogram plot *)
    spectrogramPlot = Spectrogram[audio, $fftSize, $hopSize,
      BlackmanHarrisWindow,
      ColorFunction -> colorFunc,
      Frame -> False,
      FrameTicks -> None,
      PlotRangePadding -> None,
      ImageSize -> {$imageWidth, $imageHeight}
    ];

    (* Determine output path *)
    (* Check if this is a contrast version (Won't Live Here) *)
    isContrast = StringContainsQ[songSlug, "wont-live-here"];

    If[isContrast,
      (* Export to contrast directory *)
      outPath = If[StringContainsQ[songSlug, "unreleased"],
        FileNameJoin[{$contrastOutputDir, "unreleased-heatmap.png"}],
        FileNameJoin[{$contrastOutputDir, "released-heatmap.png"}]
      ];,
      (* Export to atlas directory *)
      outDir = FileNameJoin[{$outputBaseDir, albumSlug, "songs"}];
      If[!DirectoryQ[outDir], CreateDirectory[outDir]];
      outPath = FileNameJoin[{outDir, songSlug <> "-heatmap.png"}];
    ];

    Export[outPath, spectrogramPlot, "PNG",
      ImageResolution -> 144
    ];

    Print["  Exported: ", outPath];
  ],
  {entry, processedFiles}
];

Print["\nHeatmap generation complete."];
