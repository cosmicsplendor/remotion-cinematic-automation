// Example: render.ts (or render.js)
const { bundle } = require('@remotion/bundler');
const { renderMedia, getCompositions } = require('@remotion/renderer');
const path = require('path');

const start = async () => {
  console.log("Bundling React app...");
  const bundled = await bundle({
    // Assuming your entry point is src/index.ts
    entryPoint: path.join(process.cwd(), "src", "index.ts"),
    // You can overwrite the webpack config here if needed
    webpackOverride: (config) => config,
  });

  console.log("Getting compositions...");
  const compositions = await getCompositions(bundled, {
    // You can pass custom input props to your Remotion components here
    // inputProps: {
    //   foo: "bar",
    // },
  });

  // Filter for the composition you want to render
  const composition = compositions.find((c) => c.id === "DetectiveTimeline"); // Replace with your composition ID

  if (!composition) {
    throw new Error("Composition not found");
  }

  console.log("Rendering video...");
await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: `out/${composition.id}.mp4`,
  parallelism: 1, // Set to 1 for single thread rendering
  // Remove hardware acceleration issues by using software encoding
  encodingOptions: {
    encoder: 'software'
  },
  chromiumOptions: {
    headless: 'new',
    args: [
      '--disable-gpu-vsync',
      '--disable-frame-rate-limit',
      '--no-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1920,1080'
    ],
    ignoreDefaultArgs: ['--mute-audio'],
  },
});
  console.log("Render complete!");
};

start().catch((err) => {
  console.error("Error rendering video:", err);
  process.exit(1);
});