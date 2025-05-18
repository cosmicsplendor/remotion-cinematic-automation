const { bundle } = require('@remotion/bundler');
const { renderMedia, selectComposition } = require('@remotion/renderer');
const path = require('path');

const render = async () => {
  // Get resolution from command line arguments
  const args = process.argv.slice(2);
  const widthArg = args.find(arg => arg.startsWith('--width='));
  const heightArg = args.find(arg => arg.startsWith('--height='));
  
  // Default to 1080p if not specified
  const width = widthArg ? parseInt(widthArg.split('=')[1]) : 1920;
  const height = heightArg ? parseInt(heightArg.split('=')[1]) : 1080;
  
  console.log(`Rendering at resolution: ${width}x${height}`);
  
  // Create a bundler
  const bundleLocation = await bundle({
    entryPoint: path.resolve('./src/index.js'),
    // If you have a Webpack override, add it here
    webpackOverride: (config: any) => config,
  });

  const resolutionSuffix = `${width}x${height}`;
  
  // First render the intro
  await renderMedia({
    bundleLocation,
    composition: 'Intro',
    outputLocation: `out/intro-${resolutionSuffix}.mp4`,
    imageFormat: 'jpeg',
    codec: 'h264',
    encodingCRF: 23,
    framesPerSecond: 30,
    outputSize: {
      width,
      height
    }
  });

  // Then render the timeline
  await renderMedia({
    bundleLocation,
    composition: 'DetectiveTimeline',
    outputLocation: `out/timeline-${resolutionSuffix}.mp4`,
    imageFormat: 'jpeg', 
    codec: 'h264',
    encodingCRF: 23,
    framesPerSecond: 30,
    outputSize: {
      width,
      height
    }
  });

  console.log(`Rendering complete! Output files: intro-${resolutionSuffix}.mp4 and timeline-${resolutionSuffix}.mp4`);
};

render();