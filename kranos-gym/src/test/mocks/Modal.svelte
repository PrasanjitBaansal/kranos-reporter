<!-- Mock Modal component for testing -->
<script>
    export let show = false;
    export let title = '';
    
    // Dispatch close event like the real Modal
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
    
    function close() {
        dispatch('close');
    }
</script>

{#if show}
    <div data-testid="modal" class="modal-mock">
        <div class="modal-header">
            <h2>{title}</h2>
            <button data-testid="modal-close" on:click={close}>×</button>
        </div>
        <div class="modal-body">
            <slot />
        </div>
    </div>
{/if}

<style>
    .modal-mock {
        position: relative;
        background: white;
        padding: 1rem;
    }
    .modal-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1rem;
    }
</style>