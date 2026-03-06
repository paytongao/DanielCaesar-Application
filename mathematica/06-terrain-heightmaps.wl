(* ============================================================================ *)
(* 06-terrain-heightmaps.wl                                                   *)
(* Chromesthesia Analysis Pipeline - Terrain Heightmap Generation             *)
(*                                                                            *)
(* Processes both "Won't Live Here" versions (released and unreleased).       *)
(* Creates 256x256 heightmap grids from spectral magnitude, normalizes to     *)
(* 0-1 range, and exports as JSON matching HeightmapData interface.           *)
(* Output: {grid, rows, cols, maxHeight, minHeight}                           *)
(* ============================================================================ *)

(* -------------------------------------------------------------------------- *)
(* Configuration                                                              *)
(* -------------------------------------------------------------------------- *)

$projectRoot = FileNameJoin[{DirectoryName[$InputFileName], ".."}];
$audioDir = FileNameJoin[{$projectRoot, "audio", "normalized"}];
$outputDir = FileNameJoin[{$projectRoot, "public", "data", "terrain"}];
$gridSize = 256;
$fftSize = 2048;
$hopSize = 512;

(* Map version labels to expected audio file paths *)
(* Adjust these paths to match your audio file naming convention *)
$versions = <|
  "released" -> FileNameJoin[{$audioDir, "*", "wont-live-here.wav"}],
  "unreleased" -> FileNameJoin[{$audioDir, "*", "wont-live-here-unreleased.wav"}]
|>;

(* -------------------------------------------------------------------------- *)
(* Ensure output directory exists                                             *)
(* -------------------------------------------------------------------------- *)

If[!DirectoryQ[$outputDir],
  CreateDirectory[$outputDir];
  Print["Created output directory: ", $outputDir];
];

(* -------------------------------------------------------------------------- *)
(* Helper: Downsample 2D array to target grid size                            *)
(* -------------------------------------------------------------------------- *)

downsampleGrid[data_List, targetSize_Integer] :=
  Module[{rows, cols, rowStep, colStep, rIdx, cIdx},
    rows = Length[data];
    cols = Length[data[[1]]];

    rowStep = rows / targetSize // N;
    colStep = cols / targetSize // N;

    Table[
      rIdx = Clip[Ceiling[r * rowStep], {1, rows}];
      cIdx = Clip[Ceiling[c * colStep], {1, cols}];
      data[[rIdx, cIdx]],
      {r, targetSize}, {c, targetSize}
    ]
  ];

(* -------------------------------------------------------------------------- *)
(* Helper: Normalize 2D array to [0, 1] range                                *)
(* -------------------------------------------------------------------------- *)

normalizeGrid[data_List] :=
  Module[{flat, minVal, maxVal, range},
    flat = Flatten[data];
    minVal = Min[flat];
    maxVal = Max[flat];
    range = maxVal - minVal;

    If[range == 0,
      (* Flat signal: return zeros *)
      ConstantArray[0., Dimensions[data]],
      (* Normalize *)
      (data - minVal) / range // N
    ]
  ];

(* -------------------------------------------------------------------------- *)
(* Process each version                                                       *)
(* -------------------------------------------------------------------------- *)

Do[
  Module[{version, pattern, matches, audioPath, audio, specData,
          downsampled, normalized, flat, minH, maxH, heightmapData, outPath},

    version = versionKey;
    pattern = $versions[versionKey];

    Print["Processing terrain heightmap: ", version, " ..."];

    (* Find audio file using glob pattern *)
    matches = FileNames[FileNameTake[pattern], FileNameDrop[pattern, -1] // DirectoryName, Infinity];

    (* Alternative: search all subdirectories *)
    If[Length[matches] === 0,
      matches = FileNames[
        If[version === "released", "wont-live-here.wav", "wont-live-here-unreleased.wav"],
        $audioDir,
        Infinity
      ];
    ];

    If[Length[matches] === 0,
      Print["  WARNING: No audio file found for version '", version, "'"];
      Print["  Searched for pattern: ", pattern];
      Print["  Skipping."];
      Continue[];
    ];

    audioPath = First[matches];
    Print["  Audio file: ", audioPath];

    (* Import audio *)
    audio = Import[audioPath, "Audio"];

    (* Compute spectrogram *)
    specData = Abs[SpectrogramArray[audio, $fftSize, $hopSize]];
    Print["  Raw spectrogram: ", Dimensions[specData]];

    (* Downsample to target grid size *)
    downsampled = downsampleGrid[specData, $gridSize];
    Print["  Downsampled to: ", Dimensions[downsampled]];

    (* Normalize to [0, 1] *)
    normalized = normalizeGrid[downsampled];

    (* Compute stats *)
    flat = Flatten[normalized];
    minH = Min[flat];
    maxH = Max[flat];

    (* Build JSON matching HeightmapData interface *)
    heightmapData = <|
      "grid" -> normalized,
      "rows" -> $gridSize,
      "cols" -> $gridSize,
      "maxHeight" -> maxH,
      "minHeight" -> minH
    |>;

    outPath = FileNameJoin[{$outputDir, version <> "-heightmap.json"}];
    Export[outPath, heightmapData, "JSON"];

    Print["  Height range: [", minH, ", ", maxH, "]"];
    Print["  Exported: ", outPath];
  ],
  {versionKey, Keys[$versions]}
];

Print["\nTerrain heightmap generation complete."];
