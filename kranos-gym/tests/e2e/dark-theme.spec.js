import { test, expect } from '@playwright/test';

test.describe('Dark Theme Rendering', () => {
	test.beforeEach(async ({ page }) => {
		// Mock authentication for protected pages
		await page.route('/api/auth/check', async route => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ authenticated: true })
			});
		});

		// Mock basic data for all pages
		await page.route('/api/members', async route => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{ id: 1, name: 'John Doe', phone: '555-0001', email: 'john@example.com', is_active: true }
				])
			});
		});

		await page.route('/api/plans', async route => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					{ id: 1, name: 'MMA Focus', duration_days: 90, default_amount: 120.00, is_active: true }
				])
			});
		});
	});

	test('should apply CSS custom properties correctly', async ({ page }) => {
		await page.goto('/');
		
		// Check CSS variables are defined
		const cssVariables = await page.evaluate(() => {
			const root = document.documentElement;
			const computedStyle = getComputedStyle(root);
			
			return {
				primary: computedStyle.getPropertyValue('--primary').trim(),
				background: computedStyle.getPropertyValue('--background').trim(),
				surface: computedStyle.getPropertyValue('--surface').trim(),
				text: computedStyle.getPropertyValue('--text').trim(),
				border: computedStyle.getPropertyValue('--border').trim(),
				success: computedStyle.getPropertyValue('--success').trim(),
				error: computedStyle.getPropertyValue('--error').trim(),
				warning: computedStyle.getPropertyValue('--warning').trim()
			};
		});

		// Verify color values
		expect(cssVariables.primary).toBe('#f39407');
		expect(cssVariables.background).toBe('#0a0a0a');
		expect(cssVariables.surface).toBe('#1a1a1a');
		expect(cssVariables.text).toBe('#ffffff');
		expect(cssVariables.border).toBe('#333333');
		expect(cssVariables.success).toBe('#4ade80');
		expect(cssVariables.error).toBe('#ef4444');
		expect(cssVariables.warning).toBe('#f59e0b');
	});

	test('should render dark navigation with gradient', async ({ page }) => {
		await page.goto('/');
		
		const navbar = page.locator('.navbar');
		await expect(navbar).toBeVisible();
		
		// Check navbar background styling
		const navbarStyles = await navbar.evaluate(el => {
			const styles = getComputedStyle(el);
			return {
				background: styles.backgroundImage,
				borderBottom: styles.borderBottomColor,
				boxShadow: styles.boxShadow
			};
		});
		
		// Should have gradient background
		expect(navbarStyles.background).toContain('linear-gradient');
	});

	test('should apply neon orange accent to primary elements', async ({ page }) => {
		await page.goto('/');
		
		// Check primary buttons have orange gradient
		const primaryButton = page.locator('.btn-primary').first();
		if (await primaryButton.count() > 0) {
			const buttonStyles = await primaryButton.evaluate(el => {
				const styles = getComputedStyle(el);
				return {
					background: styles.backgroundImage,
					boxShadow: styles.boxShadow
				};
			});
			
			expect(buttonStyles.background).toContain('linear-gradient');
			expect(buttonStyles.boxShadow).toContain('243, 148, 7'); // RGB of #f39407
		}
	});

	test('should display glowing effects on hover', async ({ page }) => {
		await page.goto('/members');
		
		const memberItem = page.locator('.member-item').first();
		await expect(memberItem).toBeVisible();
		
		// Get initial styles
		const initialStyles = await memberItem.evaluate(el => {
			return getComputedStyle(el).boxShadow;
		});
		
		// Hover and check for glow effect
		await memberItem.hover();
		
		const hoverStyles = await memberItem.evaluate(el => {
			return getComputedStyle(el).boxShadow;
		});
		
		// Box shadow should change on hover (indicating glow effect)
		expect(hoverStyles).not.toBe(initialStyles);
	});

	test('should render gradient cards correctly', async ({ page }) => {
		await page.goto('/');
		
		// Wait for dashboard to load
		await page.waitForSelector('.stat-card', { timeout: 10000 });
		
		const statCard = page.locator('.stat-card').first();
		await expect(statCard).toBeVisible();
		
		const cardStyles = await statCard.evaluate(el => {
			const styles = getComputedStyle(el);
			return {
				background: styles.backgroundImage,
				borderRadius: styles.borderRadius,
				backdropFilter: styles.backdropFilter
			};
		});
		
		// Should have gradient background and backdrop filter
		expect(cardStyles.background).toContain('linear-gradient');
		expect(cardStyles.backdropFilter).toContain('blur');
	});

	test('should apply dark theme to form controls', async ({ page }) => {
		await page.goto('/members');
		
		const formControl = page.locator('.form-control').first();
		await expect(formControl).toBeVisible();
		
		const inputStyles = await formControl.evaluate(el => {
			const styles = getComputedStyle(el);
			return {
				backgroundColor: styles.backgroundColor,
				color: styles.color,
				borderColor: styles.borderColor
			};
		});
		
		// Should have dark background and light text
		expect(inputStyles.backgroundColor).toContain('26, 26, 26'); // #1a1a1a
		expect(inputStyles.color).toContain('255, 255, 255'); // white text
	});

	test('should display neon checkbox styling', async ({ page }) => {
		await page.goto('/members');
		
		const neonCheckbox = page.locator('.neon-checkbox');
		await expect(neonCheckbox).toBeVisible();
		
		const checkmark = page.locator('.checkmark');
		await expect(checkmark).toBeVisible();
		
		// Click checkbox to test active state
		await neonCheckbox.click();
		
		// Check for glow effect on active state
		const activeStyles = await checkmark.evaluate(el => {
			return getComputedStyle(el).boxShadow;
		});
		
		expect(activeStyles).toContain('243, 148, 7'); // Orange glow
	});

	test('should render status badges with proper colors', async ({ page }) => {
		await page.goto('/members');
		
		const activeStatus = page.locator('.status.active').first();
		const inactiveStatus = page.locator('.status.inactive').first();
		
		if (await activeStatus.count() > 0) {
			const activeStyles = await activeStatus.evaluate(el => {
				const styles = getComputedStyle(el);
				return {
					color: styles.color,
					borderColor: styles.borderColor,
					boxShadow: styles.boxShadow
				};
			});
			
			expect(activeStyles.color).toContain('74, 222, 128'); // Green
			expect(activeStyles.boxShadow).toContain('74, 222, 128');
		}
		
		if (await inactiveStatus.count() > 0) {
			const inactiveStyles = await inactiveStatus.evaluate(el => {
				const styles = getComputedStyle(el);
				return {
					color: styles.color,
					borderColor: styles.borderColor,
					boxShadow: styles.boxShadow
				};
			});
			
			expect(inactiveStyles.color).toContain('239, 68, 68'); // Red
			expect(inactiveStyles.boxShadow).toContain('239, 68, 68');
		}
	});

	test('should apply glassmorphism effects', async ({ page }) => {
		await page.goto('/login');
		
		const loginCard = page.locator('.login-card');
		await expect(loginCard).toBeVisible();
		
		const cardStyles = await loginCard.evaluate(el => {
			const styles = getComputedStyle(el);
			return {
				backdropFilter: styles.backdropFilter,
				background: styles.backgroundImage,
				borderRadius: styles.borderRadius
			};
		});
		
		expect(cardStyles.backdropFilter).toContain('blur');
		expect(cardStyles.borderRadius).toBeTruthy();
	});

	test('should display floating particles on login page', async ({ page }) => {
		await page.goto('/login');
		
		// Wait for particles to be created
		await page.waitForTimeout(1000);
		
		const particles = page.locator('.floating-particle');
		const particleCount = await particles.count();
		
		expect(particleCount).toBeGreaterThan(0);
		
		// Check particle styling
		if (particleCount > 0) {
			const particleStyles = await particles.first().evaluate(el => {
				const styles = getComputedStyle(el);
				return {
					backgroundColor: styles.backgroundColor,
					borderRadius: styles.borderRadius,
					boxShadow: styles.boxShadow
				};
			});
			
			expect(particleStyles.backgroundColor).toContain('243, 148, 7'); // Orange
			expect(particleStyles.borderRadius).toBe('50%'); // Circle
			expect(particleStyles.boxShadow).toContain('243, 148, 7'); // Orange glow
		}
	});

	test('should animate elements on page load', async ({ page }) => {
		await page.goto('/');
		
		const animatedElements = page.locator('.animate-slide-up');
		const elementCount = await animatedElements.count();
		
		expect(elementCount).toBeGreaterThan(0);
		
		// Check animation properties
		if (elementCount > 0) {
			const animationStyles = await animatedElements.first().evaluate(el => {
				const styles = getComputedStyle(el);
				return {
					animationName: styles.animationName,
					animationDuration: styles.animationDuration
				};
			});
			
			expect(animationStyles.animationName).toBe('slideInUp');
		}
	});

	test('should maintain theme consistency across pages', async ({ page }) => {
		const pages = ['/', '/members', '/plans', '/login'];
		
		for (const pagePath of pages) {
			await page.goto(pagePath);
			
			// Check primary color consistency
			const primaryColor = await page.evaluate(() => {
				return getComputedStyle(document.documentElement)
					.getPropertyValue('--primary').trim();
			});
			
			expect(primaryColor).toBe('#f39407');
			
			// Check background color consistency
			const backgroundColor = await page.evaluate(() => {
				return getComputedStyle(document.documentElement)
					.getPropertyValue('--background').trim();
			});
			
			expect(backgroundColor).toBe('#0a0a0a');
		}
	});

	test('should display proper contrast ratios', async ({ page }) => {
		await page.goto('/');
		
		// Check text contrast on dark background
		const textElement = page.locator('body').first();
		const textStyles = await textElement.evaluate(el => {
			const styles = getComputedStyle(el);
			return {
				color: styles.color,
				backgroundColor: styles.backgroundColor
			};
		});
		
		// White text on dark background should provide good contrast
		expect(textStyles.color).toContain('255, 255, 255'); // White
		expect(textStyles.backgroundColor).toContain('10, 10, 10'); // Dark
	});

	test('should render responsive dark theme on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');
		
		// Theme variables should remain the same on mobile
		const mobileTheme = await page.evaluate(() => {
			const root = document.documentElement;
			const computedStyle = getComputedStyle(root);
			
			return {
				primary: computedStyle.getPropertyValue('--primary').trim(),
				background: computedStyle.getPropertyValue('--background').trim()
			};
		});
		
		expect(mobileTheme.primary).toBe('#f39407');
		expect(mobileTheme.background).toBe('#0a0a0a');
		
		// Mobile menu should have dark styling
		const menuToggle = page.locator('.menu-toggle');
		if (await menuToggle.count() > 0) {
			await expect(menuToggle).toBeVisible();
		}
	});
});