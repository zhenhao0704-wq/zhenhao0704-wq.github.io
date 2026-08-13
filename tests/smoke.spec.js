import { test, expect } from '@playwright/test';

const ownCodeErrors = (errors) => errors.filter(
  (error) =>
    !/youtube|googleapis|gstatic/i.test(error) &&
    !/Failed to load resource|net::ERR_/i.test(error),
);

test('home page loads without errors and exposes the complete navigation', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/index.html#about');
  await expect(page).toHaveTitle(/Zhenhao Wen/i);
  await expect(page.locator('#main')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#site-nav a')).toHaveCount(8);
  expect(await page.locator('#site-nav a').allTextContents()).toEqual([
    'About',
    'Dance Films',
    'Research',
    'Photography',
    'CV',
    'Teaching',
    'Travel',
    'Contact',
  ]);
  expect(await page.locator('#main > section.content-section').evaluateAll((sections) =>
    sections.map((section) => section.id),
  )).toEqual(['about', 'works', 'research', 'photography', 'cv', 'teaching', 'travel', 'contact']);
  await expect(page.getByRole('heading', { name: 'About', exact: true })).toBeVisible();
  expect(ownCodeErrors(errors), ownCodeErrors(errors).join('\n')).toEqual([]);
});

test('the typography separates module labels from content titles', async ({ page }) => {
  await page.goto('/index.html#works');
  await page.evaluate(() => document.fonts.ready);

  const moduleTitles = page.locator([
    '.home-page main > .content-section > .section-head > h2',
    '.home-page #about .about-copy > h2',
    '.home-page #contact > h2',
  ].join(', '));
  await expect(moduleTitles).toHaveCount(8);
  expect(await moduleTitles.allTextContents()).toEqual([
    'About',
    'Dance Films',
    'Research',
    'Photography',
    'CV',
    'Teaching',
    'Travel',
    'Contact',
  ]);
  expect(await moduleTitles.evaluateAll((titles) => titles.every((title) => {
    const style = getComputedStyle(title);
    return style.textTransform === 'uppercase' && style.fontFamily.includes('Instrument Sans');
  }))).toBe(true);

  const sizes = await moduleTitles.evaluateAll((titles) => titles.map((title) => Number.parseFloat(getComputedStyle(title).fontSize)));
  expect(Math.max(...sizes.slice(0, 7))).toBeLessThanOrEqual(56);
  expect(Math.max(...sizes.slice(7))).toBeLessThan(Math.max(...sizes.slice(0, 7)));

  expect(await page.locator('.landing h1').evaluate((title) => getComputedStyle(title).textTransform)).toBe('none');
  expect(await page.locator('.film-card-copy h3').first().evaluate((title) => getComputedStyle(title).textTransform)).toBe('none');
  expect(await page.evaluate(() => document.fonts.check('16px "Instrument Sans"'))).toBe(true);

  await page.goto('/cv.html');
  expect(await page.locator('.cv-group > h2').evaluateAll((titles) =>
    titles.every((title) => getComputedStyle(title).textTransform === 'uppercase'),
  )).toBe(true);

  await page.goto('/returned-on-loan.html');
  expect(await page.evaluate(async () => {
    const sample = 'Hawaiʻi Mānoa États-Unis Amérique Böhme';
    await document.fonts.load('16px "Instrument Sans"', sample);
    return document.fonts.check('16px "Instrument Sans"', sample);
  })).toBe(true);
});

test('the five-level text palette follows content hierarchy', async ({ page }) => {
  await page.goto('/index.html#travel');

  expect(await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return [
      '--text-hero',
      '--text-primary',
      '--text-body',
      '--text-meta',
      '--text-faint',
    ].map((token) => root.getPropertyValue(token).trim());
  })).toEqual(['#f7f6f2', '#f2f0ea', '#d1cec5', '#a09e96', '#85827a']);

  const samples = [
    ['.travel-card strong', 'rgb(242, 240, 234)'],
    ['#travel .section-head > p', 'rgb(209, 206, 197)'],
    ['.travel-card small', 'rgb(160, 158, 150)'],
    ['footer', 'rgb(133, 130, 122)'],
  ];
  for (const [selector, color] of samples) {
    await expect.poll(() => page.locator(selector).first().evaluate((element) => getComputedStyle(element).color)).toBe(color);
  }

  await page.goto('/index.html?preview=text-colour#top');
  expect(await page.locator('.landing-shade').evaluate((element) =>
    getComputedStyle(element).backgroundImage,
  )).toContain('rgba(0, 0, 0, 0.76)');
});

test('the intro plays once, remains skippable, and return visits go straight to the site', async ({ page }) => {
  await page.goto('/index.html');

  await expect(page.locator('body')).toHaveClass(/intro-active/);
  await expect(page.locator('#main')).toHaveAttribute('inert', '');
  await expect(page.locator('#intro-video')).toHaveAttribute('poster', 'media/intro-poster.jpg');
  await page.locator('#intro-skip').click();

  await expect(page.locator('body')).not.toHaveClass(/intro-active/);
  await expect(page.locator('#site-intro')).toHaveClass(/is-complete/);
  await expect(page.locator('#main')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#main')).toBeFocused();

  await page.reload();
  await expect(page.locator('body')).not.toHaveClass(/intro-active/);
  await expect(page.locator('#site-intro')).toBeHidden();

  await page.evaluate(() => window.localStorage.removeItem('zhenhao-intro-seen-v1'));
  await page.reload();
  await expect(page.locator('body')).toHaveClass(/intro-active/);

  await page.locator('#intro-video').evaluate((video) => video.dispatchEvent(new Event('ended')));
  await expect(page.locator('#site-intro')).toHaveClass(/is-name-reveal/);
  await expect(page.locator('#intro-name')).toBeVisible();
  await expect(page.locator('#main')).toHaveAttribute('inert', '');
  expect(await page.locator('.landing-video').evaluateAll((videos) => videos.every((video) => video.paused))).toBe(true);

  await expect(page.locator('body')).not.toHaveClass(/intro-active/, { timeout: 5000 });
  await expect(page.locator('#main')).not.toHaveAttribute('inert', '');
  await expect.poll(() => page.locator('.landing-video').evaluateAll((videos) => videos.some((video) => !video.paused))).toBe(true);
});

test('the site remains usable if the enhancement script fails', async ({ page }) => {
  await page.route('**/redesign.js*', (route) => route.abort());
  await page.goto('/index.html');

  await expect(page.locator('body')).not.toHaveClass(/intro-active/);
  await expect(page.locator('#site-intro')).toBeHidden();
  await expect(page.locator('#main')).not.toHaveAttribute('inert', '');
  await expect(page.getByRole('heading', { name: 'Zhenhao Wen', exact: true })).toBeVisible();
});

test('deep links and reduced motion bypass the intro', async ({ page }) => {
  await page.goto('/index.html#research');
  await expect(page.locator('body')).not.toHaveClass(/intro-active/);
  await expect(page.locator('#site-intro')).toBeHidden();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/index.html');
  await expect(page.locator('body')).not.toHaveClass(/intro-active/);
  await expect(page.locator('#site-intro')).toBeHidden();
});

test('the landing page loops the visual opening and keeps a static motion fallback', async ({ page }) => {
  await page.goto('/index.html#top');
  await page.locator('#intro-skip').click();

  await expect(page.locator('.landing-video')).toHaveCount(2);
  await expect(page.locator('.landing-video').first()).toHaveAttribute('poster', 'media/landing-poster.jpg');
  await expect(page.locator('#intro-video source[data-src="media/intro.mp4"]')).toHaveCount(1);
  await expect(page.locator('.landing-video source[data-src="media/landing-loop.mp4"]')).toHaveCount(2);
  await expect(page.locator('.landing-video').first()).toHaveJSProperty('playbackRate', 1);
  const duration = await page.locator('.landing-video').first().evaluate((video) => video.duration);
  expect(duration).toBeGreaterThan(21);
  expect(duration).toBeLessThan(22.2);

  const motionToggle = page.locator('#landing-motion-toggle');
  await expect(motionToggle).toBeVisible();
  await expect(motionToggle).toHaveText('Pause background video');
  await motionToggle.click();
  await expect(motionToggle).toHaveText('Play background video');
  await expect(motionToggle).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('.landing-video').evaluateAll((videos) => videos.every((video) => video.paused))).toBe(true);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/index.html?reduced=1#top');
  await expect(page.locator('#landing-motion-toggle')).toHaveText('Play background video');
  await expect(page.locator('.landing')).toHaveClass(/is-static/);
});

test('the portrait landing crop follows people across the longer native-speed edit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html#top');
  await page.locator('#intro-skip').click();
  const activeVideo = page.locator('.landing-video.is-visible');
  await page.waitForFunction(() => document.querySelector('.landing-video.is-visible')?.readyState >= 1);
  expect(await page.evaluate(() => window.matchMedia('(orientation: portrait) and (max-width: 900px)').matches)).toBe(true);

  await activeVideo.evaluate((video) => {
    Object.defineProperty(video, 'currentTime', { configurable: true, writable: true, value: 10.2 });
    video.dispatchEvent(new Event('timeupdate'));
  });
  expect(await activeVideo.evaluate((video) => video.style.getPropertyValue('--landing-focus-x'))).toBe('72%');
  await expect.poll(() => activeVideo.evaluate((video) => getComputedStyle(video).objectPosition)).toBe('72% 50%');

  await activeVideo.evaluate((video) => {
    video.currentTime = 20.5;
    video.dispatchEvent(new Event('timeupdate'));
  });
  await expect.poll(() => activeVideo.evaluate((video) => getComputedStyle(video).objectPosition)).toBe('45% 50%');
});

test('titles consistently precede metadata and published films show verified durations', async ({ page }) => {
  await page.goto('/index.html#works');

  const titleBlocks = page.locator('.title-block');
  expect(await titleBlocks.evaluateAll((blocks) => blocks.every((block) => {
    const heading = block.querySelector('h3');
    const metadata = block.querySelector('.item-meta');
    return heading && metadata && Boolean(heading.compareDocumentPosition(metadata) & Node.DOCUMENT_POSITION_FOLLOWING);
  }))).toBe(true);

  expect(await page.locator('#works .item-meta').allTextContents()).toEqual(expect.arrayContaining([
    'Practice-as-research dance film, 2025, 5:01',
    'Dance film, 2025, 10:57',
    'Dance film, 2025, 10:15',
    'Dance film, 2025, 9:47',
    'Dance film, 2022, 4:17',
    'Dance film, 2022, 3:28',
  ]));
});

test('the site presents original image colour without a shared CSS filter', async ({ page }) => {
  await page.goto('/index.html#photography');
  const selectors = [
    '.landing-video',
    '.portrait-wrap img',
    '.film-card-media img',
    '.research-card img',
    '.photo-project > img',
    '.travel-card img',
    '.teaching-media img',
  ];
  for (const selector of selectors) {
    const elements = page.locator(selector);
    expect(await elements.evaluateAll((items) => items.every((item) => getComputedStyle(item).filter === 'none')), selector).toBe(true);
  }
});

test('every dance film has an image and the published films retain the original links', async ({ page }) => {
  await page.goto('/index.html#works');

  await expect(page.locator('.film-grid .film-card')).toHaveCount(6);
  await expect(page.locator('.film-grid .film-card-media img')).toHaveCount(6);
  await expect(page.locator('.film-card', { hasText: 'Facing the Mirror' }).locator('[data-video-id]')).toHaveCount(0);

  const ids = await page.locator('#works [data-video-id]').evaluateAll((elements) =>
    [...new Set(elements.map((element) => element.dataset.videoId))].sort(),
  );
  expect(ids).toEqual([
    '7V75O94rXgM',
    '8a7t169MjLk',
    'PiYInr_Njfg',
    'Q-Nhm69mwGU',
    'uSJY9lDNZ8s',
    'zrJrTZVFWXY',
  ].sort());

  const thumbnails = page.locator('.film-card button.film-card-media img');
  for (let index = 0; index < await thumbnails.count(); index += 1) {
    const image = thumbnails.nth(index);
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate((element) => [element.naturalWidth, element.naturalHeight])).toEqual([1280, 720]);
  }
});

test('film dialogs use the correct title and return focus', async ({ page }) => {
  await page.goto('/index.html#works');
  const trigger = page.getByRole('button', { name: 'Watch Makeup' });
  await trigger.click();

  await expect(page.locator('#video-dialog')).toHaveAttribute('open', '');
  await expect(page.locator('#video-dialog-title')).toHaveText('Makeup');
  await expect(page.locator('#video-frame')).toHaveAttribute('title', 'Makeup');
  await expect(page.locator('#video-frame')).toHaveAttribute('src', /Q-Nhm69mwGU/);
  await expect(page.locator('#video-external')).toHaveAttribute('href', 'https://www.youtube.com/watch?v=Q-Nhm69mwGU');

  await page.keyboard.press('Escape');
  await expect(page.locator('#video-dialog')).not.toHaveAttribute('open', '');
  await expect(page.locator('#video-frame')).toHaveAttribute('src', '');
  await expect(trigger).toBeFocused();
});

test('production photography opens as a gallery and full-screen viewer', async ({ page }) => {
  await page.goto('/index.html#photography');
  const trigger = page.locator('[data-gallery="friends"]');
  await trigger.click();

  await expect(page.locator('#gallery-dialog')).toHaveAttribute('open', '');
  await expect(page.locator('#gallery-title')).toHaveText('Friends');
  await expect(page.locator('#gallery-count')).toHaveText('15 photographs');
  await expect(page.locator('#gallery-grid .gallery-thumb')).toHaveCount(15);
  await expect(page.locator('#gallery-grid .gallery-thumb img').first()).toHaveAttribute('src', /img\/thumbs\/400\//);
  expect(await page.locator('#gallery-grid .gallery-thumb img').evaluateAll((images) =>
    images.every((image) => image.width > 0 && image.height > 0),
  )).toBe(true);

  await page.locator('#gallery-grid .gallery-thumb').first().click();
  await expect(page.locator('#gallery-viewer')).toBeVisible();
  await expect(page.locator('#viewer-position')).toHaveText('1 of 15');
  await expect(page.locator('#viewer-image')).toHaveAttribute('src', /img\/thumbs\/1200\//);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#viewer-position')).toHaveText('2 of 15');

  await page.keyboard.press('Escape');
  await expect(page.locator('#gallery-viewer')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('#gallery-dialog')).not.toHaveAttribute('open', '');
  await expect(trigger).toBeFocused();
});

test('all twenty travel galleries are present and total 553 photographs', async ({ page }) => {
  await page.goto('/index.html#travel');
  const cards = page.locator('#travel [data-gallery]');
  await expect(cards).toHaveCount(20);

  const total = await cards.locator('small').evaluateAll((labels) =>
    labels.reduce((sum, label) => sum + Number(label.textContent.match(/\d+/)?.[0] || 0), 0),
  );
  expect(total).toBe(553);

  await page.locator('[data-gallery="france"]').click();
  await expect(page.locator('#gallery-count')).toHaveText('29 photographs');
  await expect(page.locator('#gallery-grid .gallery-thumb')).toHaveCount(29);

  await page.keyboard.press('Escape');
  await page.locator('[data-gallery="qatar"]').click();
  await expect(page.locator('#gallery-title')).toHaveText('Qatar');
  await expect(page.locator('#gallery-count')).toHaveText('27 photographs');
  await expect(page.locator('#gallery-grid .gallery-thumb')).toHaveCount(27);

  await page.keyboard.press('Escape');
  await page.locator('[data-gallery="czech"]').click();
  await expect(page.locator('#gallery-title')).toHaveText('Czech Republic');
  await expect(page.locator('#gallery-count')).toHaveText('32 photographs');
  await expect(page.locator('#gallery-grid .gallery-thumb')).toHaveCount(32);

  await page.keyboard.press('Escape');
  await page.locator('[data-gallery="austria"]').click();
  await expect(page.locator('#gallery-title')).toHaveText('Austria');
  await expect(page.locator('#gallery-count')).toHaveText('19 photographs');
  await expect(page.locator('#gallery-grid .gallery-thumb')).toHaveCount(19);

  await page.keyboard.press('Escape');
  await page.locator('[data-gallery="turkey"]').click();
  await expect(page.locator('#gallery-title')).toHaveText('Turkey');
  await expect(page.locator('#gallery-count')).toHaveText('10 photographs');
  await expect(page.locator('#gallery-grid .gallery-thumb')).toHaveCount(10);
});

test('travel country covers keep a consistent landscape ratio', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/index.html#travel');

  const covers = page.locator('.travel-card img');
  await expect(covers).toHaveCount(20);
  const ratios = await covers.evaluateAll((images) => images.map((image) => {
    const bounds = image.getBoundingClientRect();
    return bounds.width / bounds.height;
  }));
  expect(ratios.every((ratio) => Math.abs(ratio - (4 / 3)) < 0.01)).toBe(true);

  const firstRowTop = await page.locator('.travel-card').first().evaluate((card) => card.getBoundingClientRect().top);
  const secondRowTop = await page.locator('.travel-card').nth(4).evaluate((card) => card.getBoundingClientRect().top);
  expect(secondRowTop - firstRowTop).toBeLessThan(400);
});

test('homepage images reserve their layout space and galleries use optimized derivatives', async ({ page }) => {
  await page.goto('/index.html#top');

  expect(await page.locator('#main img').evaluateAll((images) =>
    images.every((image) => Number(image.getAttribute('width')) > 0 && Number(image.getAttribute('height')) > 0),
  )).toBe(true);

  expect(await page.evaluate(() => Object.values(window.PORTFOLIO_GALLERIES).every((gallery) =>
    gallery.items.every((item) =>
      item.thumb.includes('/thumbs/400/') &&
      item.src.includes('/thumbs/1200/') &&
      item.width > 0 &&
      item.height > 0
    ),
  ))).toBe(true);
});

test('the mobile menu has usable targets and closes cleanly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html#about');

  const menu = page.locator('#menu-toggle');
  const nav = page.locator('#site-nav');
  await menu.click();

  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(nav).toBeVisible();
  expect((await menu.boundingBox()).height).toBeGreaterThanOrEqual(44);
  expect((await nav.getByRole('link', { name: 'About' }).boundingBox()).height).toBeGreaterThanOrEqual(44);

  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(nav).not.toBeVisible();
});

test('the disconnected comment interface is not exposed to visitors', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('#comments, #comment-form')).toHaveCount(0);
  await expect(page.locator('meta[name="comment-api-url"], meta[name="turnstile-sitekey"]')).toHaveCount(0);
  await expect(page.locator('script[src^="comments.js"], link[href^="comments.css"]')).toHaveCount(0);
});

test('research journals share the new system and keep their content structure', async ({ page }) => {
  await page.goto('/bodies-left-out.html');
  await expect(page.locator('link[href^="project.css"]')).toHaveCount(1);
  expect(await page.locator('.project-nav .nav-links a').allTextContents()).toEqual([
    'About',
    'Dance Films',
    'Research',
    'Photography',
    'CV',
    'Teaching',
    'Travel',
    'Contact',
  ]);
  await expect(page.getByRole('heading', { level: 2, name: /^Week/ })).toHaveCount(7);
  await expect(page.locator('.par-week-video iframe')).toHaveCount(11);
  await expect(page.locator('.par-week-video iframe[title][loading="lazy"]')).toHaveCount(11);
  await expect(page.locator('.project-back')).toHaveAttribute('href', 'index.html#research');
  await expect(page.getByText('This week\'s entry is temporarily held back.')).toBeVisible();
  await expect(page.getByText('The Exclusionary Nature of Archives')).toHaveCount(0);

  await page.goto('/returned-on-loan.html');
  await expect(page.getByRole('heading', { level: 2, name: /^Week/ })).toHaveCount(4);
  await expect(page.locator('.par-week-video iframe[title][loading="lazy"]')).toHaveCount(1);
  await expect(page.locator('.project-back')).toHaveAttribute('href', 'index.html#research');
});

test('the full CV restores all twenty substantive entries', async ({ page }) => {
  await page.goto('/cv.html');
  await expect(page.getByRole('heading', { level: 1, name: 'Zhenhao Wen' })).toBeVisible();
  await expect(page.locator('.cv-rows article')).toHaveCount(20);
  await expect(page.getByText('Publications and presentations', { exact: true })).toBeVisible();
  await expect(page.getByText('Performances and production', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print / save PDF' })).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('button', { name: 'Print / save PDF' })).toBeHidden();
  expect(await page.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor)).toBe('rgb(255, 255, 255)');
});

test('teaching archive images remain secondary to the teaching information', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/index.html#teaching');
  const heights = await page.locator('.teaching-media img').evaluateAll((images) => images.map((image) => image.getBoundingClientRect().height));
  expect(Math.max(...heights)).toBeLessThanOrEqual(240);
});

test('desktop and mobile pages do not overflow', async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 768, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const url of ['/index.html#top', '/cv.html', '/bodies-left-out.html']) {
      await page.goto(url);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width, `${url} overflows at ${viewport.width}px`).toBeLessThanOrEqual(viewport.width);
    }
  }
});

test('featured photography and gallery viewer load bounded optimized sources', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto('/index.html#photography');

  const selectors = [
    '.research-card:nth-child(2) img',
    '.photo-project > img',
    '.teaching-media img',
    '.travel-card img',
  ];
  for (const selector of selectors) {
    const images = page.locator(selector);
    for (let index = 0; index < await images.count(); index += 1) {
      const image = images.nth(index);
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveJSProperty('complete', true);
      expect(await image.evaluate((element) => element.currentSrc)).toMatch(/img\/thumbs\/(400|1200)\//);
      expect(await image.evaluate((element) => element.naturalWidth)).toBeLessThanOrEqual(1200);
    }
  }

  await page.locator('[data-gallery="friends"]').click();
  await page.locator('#gallery-grid .gallery-thumb').first().click();
  await expect(page.locator('#viewer-image')).toHaveJSProperty('complete', true);
  await expect(page.locator('#viewer-image')).toHaveAttribute('src', /img\/thumbs\/1200\//);
  expect(await page.locator('#viewer-image').evaluate((element) => element.naturalWidth)).toBeLessThanOrEqual(1200);
  await context.close();
});
