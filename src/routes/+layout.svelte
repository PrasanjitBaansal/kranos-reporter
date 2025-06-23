<script>
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    
    let currentPath = '';
    
    $: currentPath = $page.url.pathname;
    
    const navItems = [
        { label: 'Members', path: '/members', icon: '👥' },
        { label: 'Group Plans', path: '/group-plans', icon: '📋' },
        { label: 'Memberships', path: '/memberships', icon: '🎫' },
        { label: 'Reporting', path: '/reporting', icon: '📊' }
    ];
    
    function isActive(path) {
        if (path === '/') return currentPath === '/';
        return currentPath.startsWith(path);
    }
    
    function handleNavClick(path) {
        goto(path);
    }
</script>

<div class="app-container">
    <header class="header">
        <div class="header-content">
            <h1 class="app-title">
                <span class="logo">🏋️</span>
                Kranos Gym Management
            </h1>
            <nav class="nav-tabs">
                {#each navItems as item}
                    <button 
                        class="nav-tab" 
                        class:active={isActive(item.path)}
                        on:click={() => handleNavClick(item.path)}
                    >
                        <span class="nav-icon">{item.icon}</span>
                        <span class="nav-label">{item.label}</span>
                    </button>
                {/each}
            </nav>
        </div>
    </header>
    
    <main class="main-content">
        <slot />
    </main>
</div>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background-color: #f5f5f5;
        color: #333;
    }
    
    :global(*) {
        box-sizing: border-box;
    }
    
    .app-container {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    }
    
    .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        position: sticky;
        top: 0;
        z-index: 100;
    }
    
    .header-content {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 20px;
    }
    
    .app-title {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
        padding: 20px 0 16px 0;
        font-size: 24px;
        font-weight: 600;
    }
    
    .logo {
        font-size: 28px;
    }
    
    .nav-tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .nav-tab {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.8);
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        border-radius: 8px 8px 0 0;
        transition: all 0.2s ease;
        position: relative;
    }
    
    .nav-tab:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        transform: translateY(-1px);
    }
    
    .nav-tab.active {
        background: rgba(255, 255, 255, 0.15);
        color: white;
        border-bottom: 3px solid #fbbf24;
    }
    
    .nav-tab.active::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 3px;
        background: #fbbf24;
        border-radius: 2px 2px 0 0;
    }
    
    .nav-icon {
        font-size: 16px;
    }
    
    .nav-label {
        font-weight: 500;
    }
    
    .main-content {
        flex: 1;
        max-width: 1200px;
        margin: 0 auto;
        padding: 24px 20px;
        width: 100%;
    }
    
    /* Responsive Design */
    @media (max-width: 768px) {
        .header-content {
            padding: 0 16px;
        }
        
        .app-title {
            font-size: 20px;
            padding: 16px 0 12px 0;
        }
        
        .nav-tabs {
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }
        
        .nav-tabs::-webkit-scrollbar {
            display: none;
        }
        
        .nav-tab {
            padding: 10px 16px;
            font-size: 13px;
            white-space: nowrap;
            flex-shrink: 0;
        }
        
        .nav-icon {
            font-size: 14px;
        }
        
        .main-content {
            padding: 16px 12px;
        }
    }
    
    @media (max-width: 480px) {
        .nav-tab .nav-label {
            display: none;
        }
        
        .nav-tab {
            padding: 10px 12px;
            min-width: 44px;
            justify-content: center;
        }
        
        .nav-icon {
            font-size: 18px;
        }
    }
    
    /* Loading and transition states */
    .main-content {
        animation: fadeIn 0.3s ease-in-out;
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    /* Focus styles for accessibility */
    .nav-tab:focus {
        outline: 2px solid #fbbf24;
        outline-offset: 2px;
    }
    
    /* Print styles */
    @media print {
        .header {
            display: none;
        }
        
        .main-content {
            max-width: none;
            margin: 0;
        }
    }
</style>