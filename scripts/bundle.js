await Bun.build({
  entrypoints: [
    "./src/index.ts",
    "./src/bin/cw721-stream.ts",
    "./src/bin/mrkt-stream.ts",
    "./src/bin/pallet-stream.ts"
  ],
  outdir: "dist",
  target: "bun",
  sourcemap: "external"
});
