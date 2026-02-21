// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Pulse',
			expressiveCode: {
				themes: ['min-dark'],
			},
			description: 'Docs for the Pulse trace service and SDK.',
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/EK-LABS-LLC/trace-service',
				},
			],
			customCss: ['/src/styles/pulse.css'],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Quickstart', slug: 'docs' },
						{ label: 'Dashboard UI (Docker)', slug: 'docs/dashboard-ui' },
						{ label: 'Configuration', slug: 'docs/config' },
					],
				},
				{
					label: 'Modes',
					items: [{ label: 'Single vs Scale', slug: 'docs/modes' }],
				},
				{
					label: 'CLI',
					items: [{ label: 'CLI Reference', slug: 'docs/cli' }],
				},
				{
					label: 'Integrations',
					items: [
						{ label: 'Claude Code', slug: 'docs/claude-code' },
						{ label: 'Opencode', slug: 'docs/opencode' },
						{ label: 'OpenClaw', slug: 'docs/openclaw' },
					],
				},
				{
					label: 'SDK',
					items: [
						{ label: 'Providers', slug: 'docs/providers' },
						{ label: 'Sessions & Metadata', slug: 'docs/sessions' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'REST API', slug: 'docs/api' },
						{ label: 'Dashboard API', slug: 'docs/dashboard-api' },
					],
				},
			],
			credits: false,
		}),
		mdx(),
	],
});
