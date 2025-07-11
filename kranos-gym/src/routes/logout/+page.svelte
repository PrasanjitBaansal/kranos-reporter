<script>
	import { onMount } from 'svelte';
	
	onMount(() => {
		// This page should redirect immediately via +page.server.js
		// If we're still here, something went wrong
		window.location.href = '/login';
	});
</script>

<div class="logout-container">
	<p>Logging out...</p>
</div>

<style>
	.logout-container {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100vh;
		color: var(--text-muted);
	}
</style>