module.exports = async (page, scenario, viewport) => {
  console.log(`SCENARIO > ${scenario.label} (${viewport.label})`);

  if (scenario.selectors && scenario.selectors.includes('document')) {
    // adjust viewport height so that we see enough of sidebar

    const bodyHandle = await page.$('body');

    const { width, height } = await bodyHandle.boundingBox();

    console.log(`    ${scenario.label} height: ${height}, width: ${width}`);

    await bodyHandle.dispose();

    await page.setViewport({
      width: Math.ceil(viewport.width),
      height: Math.ceil(Math.max(viewport.height, Math.ceil(height)))
    });
  }

  await page.evaluate(() => {
    window.scrollBy(0, 0);
  });

  console.log('--- waiting... ---');
  await page.waitFor(5000);
  console.log('--- waiting done ---');

  await require('./clickAndHoverHelper')(page, scenario);
};
