(* ============================================================================ *)
(* 05-gradient-fields.wl                                                      *)
(* Chromesthesia Analysis Pipeline - Spectral Gradient Fields                 *)
(*                                                                            *)
(* Computes numerical gradient of spectral magnitude in both time and         *)
(* frequency directions. Adds gradient data to existing song JSON files.      *)
(* Gradient format: [timeGradient[][], frequencyGradient[][]]                 *)
(* ============================================================================ *)

(* -------------------------------------------------------------------------- *)
(* Configuration                                                              *)
(* -------------------------------------------------------------------------- *)

$projectRoot = FileNameJoin[{DirectoryName[$InputFileName], ".."}];
$outputBaseDir = FileNameJoin[{$projectRoot, "public", "data", "atlas"}];

(* -------------------------------------------------------------------------- *)
(* Helper: Compute numerical gradient along rows (time direction)             *)
(* Uses central differences for interior points, forward/backward at edges.   *)
(* -------------------------------------------------------------------------- *)

timeGradient[data_List] :=
  Module[{rows, cols, grad},
    rows = Length[data];
    cols = Length[data[[1]]];

    grad = Table[0., {rows}, {cols}];

    Do[
      (* Forward difference at first column *)
      grad[[r, 1]] = data[[r, 2]] - data[[r, 1]];

      (* Central differences for interior *)
      Do[
        grad[[r, c]] = (data[[r, c + 1]] - data[[r, c - 1]]) / 2.0,
        {c, 2, cols - 1}
      ];

      (* Backward difference at last column *)
      grad[[r, cols]] = data[[r, cols]] - data[[r, cols - 1]],
      {r, rows}
    ];

    grad
  ];

(* -------------------------------------------------------------------------- *)
(* Helper: Compute numerical gradient along columns (frequency direction)     *)
(* -------------------------------------------------------------------------- *)

frequencyGradient[data_List] :=
  Module[{rows, cols, grad},
    rows = Length[data];
    cols = Length[data[[1]]];

    grad = Table[0., {rows}, {cols}];

    Do[
      (* Forward difference at first row *)
      grad[[1, c]] = data[[2, c]] - data[[1, c]];

      (* Central differences for interior *)
      Do[
        grad[[r, c]] = (data[[r + 1, c]] - data[[r - 1, c]]) / 2.0,
        {r, 2, rows - 1}
      ];

      (* Backward difference at last row *)
      grad[[rows, c]] = data[[rows, c]] - data[[rows - 1, c]],
      {c, cols}
    ];

    grad
  ];

(* -------------------------------------------------------------------------- *)
(* Discover all song JSON files produced by spectral analysis                 *)
(* -------------------------------------------------------------------------- *)

songJsonFiles = FileNames["*.json", FileNameJoin[{$outputBaseDir, "*", "songs"}]];

(* Filter out any heatmap or non-spectral files *)
songJsonFiles = Select[songJsonFiles, !StringContainsQ[#, "heatmap"] &];

If[Length[songJsonFiles] === 0,
  Print["ERROR: No song JSON files found in ", $outputBaseDir];
  Print["Run 02-spectral-analysis.wl first."];
  Abort[];
];

Print["Found ", Length[songJsonFiles], " song JSON file(s) to process"];

(* -------------------------------------------------------------------------- *)
(* Process each song JSON - add gradient data                                 *)
(* -------------------------------------------------------------------------- *)

Do[
  Module[{jsonData, freqBins, tGrad, fGrad, gradientPair},

    Print["Computing gradient: ", FileNameTake[jsonFile], " ..."];

    (* Load existing spectral data *)
    jsonData = Import[jsonFile, "RawJSON"];

    If[!AssociationQ[jsonData] || !KeyExistsQ[jsonData, "frequencyBins"],
      Print["  WARNING: Invalid JSON structure. Skipping."];
      Continue[];
    ];

    freqBins = jsonData["frequencyBins"];

    If[!MatrixQ[freqBins, NumericQ],
      Print["  WARNING: frequencyBins is not a valid numeric matrix. Skipping."];
      Continue[];
    ];

    Print["  Grid size: ", Dimensions[freqBins]];

    (* Compute gradients *)
    tGrad = timeGradient[freqBins];
    fGrad = frequencyGradient[freqBins];

    (* gradient is a tuple: [timeGradient[][], frequencyGradient[][]] *)
    (* This matches the SpectralData.gradient?: [number[][], number[][]] type *)
    gradientPair = {tGrad, fGrad};

    (* Add gradient to JSON data *)
    jsonData["gradient"] = gradientPair;

    (* Re-export *)
    Export[jsonFile, jsonData, "JSON"];

    Print["  Gradient added and exported."];
  ],
  {jsonFile, songJsonFiles}
];

Print["\nGradient field computation complete."];
