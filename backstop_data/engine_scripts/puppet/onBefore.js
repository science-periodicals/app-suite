module.exports = async (page, scenario, viewport) => {
  await require('./loadCookies')(page, scenario);

  if (scenario.username) {
    console.log(
      `http://127.0.0.1:3000/login?next=${encodeURIComponent(scenario.url)}`
    );

    await page.goto(
      `http://127.0.0.1:3000/login?next=${encodeURIComponent(scenario.url)}`
    );

    await page.waitFor('button[type="submit"]');
    await page.type('input[name="username"]', scenario.username);
    await page.type('input[name="password"]', scenario.password || 'pass');
    await page.click('button[type="submit"]');

    console.log('--- waiting for page navigation... ---');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }); //networkidle0 is only possible as we turn off replication and ws when process.env.CI is true
    console.log('--- navigation done ---');
  }

  // reload so that `networkidle0` is reliable
  console.log('--- reloading... ---');
  await page.reload({ waitUntil: 'networkidle0', timeout: 60000 });
  // wait so that window resize effect fully settles
  console.log('--- reloading done ---');
};
