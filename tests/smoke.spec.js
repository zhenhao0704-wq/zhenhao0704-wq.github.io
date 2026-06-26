import { test, expect } from '@playwright/test';

// Lightweight smoke tests covering the site's core DOM interactions.
// These would have caught the lightbox id-mismatch bug (every thumbnail click
// threw a TypeError) by failing on both the console-error check and the
// "lightbox opens" check below.

test('home page loads with no JavaScript errors', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/index.html');
  await expect(page).toHaveTitle(/Zhenhao Wen/i);

  // We only care about errors from our own code. Ignore:
  //  - failed loads of third-party embeds (giscus, youtube, fonts), and
  //  - network/resource-load failures (offline CI, blocked proxy) which show
  //    up as "Failed to load resource" / net::ERR_* and aren't code bugs.
  const ownErrors = errors.filter(
    (e) =>
      !/giscus|youtube|googleapis|gstatic|wixstatic|cloudflare/i.test(e) &&
      !/Failed to load resource|net::ERR_/i.test(e),
  );
  expect(ownErrors, ownErrors.join('\n')).toEqual([]);
});

test('clicking a gallery thumbnail opens the lightbox with the image', async ({ page }) => {
  await page.goto('/index.html');

  const lightbox = page.locator('#lightbox');
  const lightboxImg = page.locator('#lightboxImg');
  await expect(lightbox).not.toHaveClass(/active/);

  const thumb = page.locator('.photo-item').first();
  await thumb.scrollIntoViewIfNeeded();
  await thumb.click();

  await expect(lightbox).toHaveClass(/active/);
  // The regression guard: src must be populated, not empty/null.
  await expect(lightboxImg).toHaveAttribute('src', /.+/);

  // Escape closes it again and clears the src.
  await page.keyboard.press('Escape');
  await expect(lightbox).not.toHaveClass(/active/);
  await expect(lightboxImg).toHaveAttribute('src', '');
});

test('clicking a video card opens the video modal, Escape closes it', async ({ page }) => {
  await page.goto('/index.html');

  const modal = page.locator('#videoModal');
  await expect(modal).not.toHaveClass(/active/);

  const card = page.locator('.work-card').first();
  await card.scrollIntoViewIfNeeded();
  await card.click();

  await expect(modal).toHaveClass(/active/);
  await expect(page.locator('#videoFrame')).toHaveAttribute('src', /youtube\.com\/embed\//);

  await page.keyboard.press('Escape');
  await expect(modal).not.toHaveClass(/active/);
});

test('teaching carousel advances to the next slide', async ({ page }) => {
  await page.goto('/index.html');

  const carousel = page.locator('.teaching-carousel').first();
  await carousel.scrollIntoViewIfNeeded();

  const slides = carousel.locator('.teaching-carousel-slide');
  const count = await slides.count();
  test.skip(count < 2, 'carousel needs at least two slides');

  await expect(slides.nth(0)).toHaveClass(/active/);
  await carousel.locator('.teaching-carousel-arrow.next').click();
  await expect(slides.nth(0)).not.toHaveClass(/active/);
  await expect(slides.nth(1)).toHaveClass(/active/);
});
