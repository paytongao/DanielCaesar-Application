(* ============================================================================ *)
(* 03-color-extraction.wl                                                     *)
(* Chromesthesia Analysis Pipeline - Album Color Extraction                   *)
(*                                                                            *)
(* Loads album cover images, extracts 6 dominant colors per album using       *)
(* DominantColors, converts to hex strings, and exports palette.json files.   *)
(* ============================================================================ *)

(* -------------------------------------------------------------------------- *)
(* Configuration                                                              *)
(* -------------------------------------------------------------------------- *)

$projectRoot = FileNameJoin[{DirectoryName[$InputFileName], ".."}];
$coversDir = FileNameJoin[{$projectRoot, "audio", "covers"}];
$outputBaseDir = FileNameJoin[{$projectRoot, "public", "data", "atlas"}];
$numColors = 6;

(* -------------------------------------------------------------------------- *)
(* Helper: Convert RGBColor to hex string                                     *)
(* -------------------------------------------------------------------------- *)

rgbToHex[color_RGBColor] :=
  Module[{r, g, b},
    {r, g, b} = Round[255 * List @@ ColorConvert[color, "RGB"][[1 ;; 3]]];
    "#" <> IntegerString[r, 16, 2] <> IntegerString[g, 16, 2] <> IntegerString[b, 16, 2]
  ];

rgbToHex[color_] :=
  Module[{rgb},
    rgb = ColorConvert[color, "RGB"];
    rgbToHex[rgb]
  ];

(* -------------------------------------------------------------------------- *)
(* Discover album cover images                                                *)
(* -------------------------------------------------------------------------- *)

$imageExtensions = {"jpg", "jpeg", "png", "tiff", "bmp"};

coverFiles = Flatten[
  FileNames["*." <> #, $coversDir] & /@ $imageExtensions
];

If[Length[coverFiles] === 0,
  Print["ERROR: No album cover images found in ", $coversDir];
  Print["Expected files named: <album-slug>.jpg (or .png, etc.)"];
  Print["Example: audio/covers/freudian.jpg"];
  Abort[];
];

Print["Found ", Length[coverFiles], " album cover(s)"];

(* -------------------------------------------------------------------------- *)
(* Process each album cover                                                   *)
(* -------------------------------------------------------------------------- *)

allPalettes = <||>;

Do[
  Module[{albumSlug, img, colors, hexColors, outDir, outPath, paletteData},

    albumSlug = FileBaseName[coverFile];

    Print["Extracting colors: ", albumSlug, " ..."];

    (* Import image *)
    img = Quiet[Import[coverFile]];
    If[!ImageQ[img],
      Print["  ERROR: Could not load image ", coverFile, ". Skipping."];
      Continue[];
    ];

    (* Extract dominant colors *)
    colors = DominantColors[img, $numColors];

    If[!ListQ[colors] || Length[colors] === 0,
      Print["  WARNING: DominantColors returned no results for ", albumSlug];
      Continue[];
    ];

    (* Pad to exactly $numColors if fewer were found *)
    If[Length[colors] < $numColors,
      colors = PadRight[colors, $numColors, colors];
    ];

    (* Convert to hex *)
    hexColors = rgbToHex /@ colors;

    Print["  Colors: ", hexColors];

    (* Build palette data matching Palette interface: {dominantColors: string[]} *)
    paletteData = <|"dominantColors" -> hexColors|>;

    (* Export to public/data/atlas/<album>/palette.json *)
    outDir = FileNameJoin[{$outputBaseDir, albumSlug}];
    If[!DirectoryQ[outDir], CreateDirectory[outDir]];

    outPath = FileNameJoin[{outDir, "palette.json"}];
    Export[outPath, paletteData, "JSON"];

    allPalettes[albumSlug] = hexColors;

    Print["  Exported: ", outPath];
  ],
  {coverFile, coverFiles}
];

(* -------------------------------------------------------------------------- *)
(* Summary                                                                    *)
(* -------------------------------------------------------------------------- *)

Print["\nColor extraction complete."];
Print["Albums processed: ", Length[allPalettes]];

Do[
  Print["  ", slug, ": ", allPalettes[slug]],
  {slug, Keys[allPalettes]}
];
