await Bun.build({
  entrypoints: ["./src/index.ts", "./src/bin/*.ts"],
  outdir: "dist",
  target: "bun",
  sourcemap: "external"
});
