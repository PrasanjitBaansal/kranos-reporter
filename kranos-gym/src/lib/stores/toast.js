import { writable } from 'svelte/store';

function createToastStore() {
	const { subscribe, set, update } = writable([]);

	return {
		subscribe,
		add: (toast) => {
			const id = Date.now() + Math.random();
			const newToast = {
				id,
				type: toast.type || 'info',
				message: toast.message,
				duration: toast.duration || 4000,
				entering: true,
				exiting: false
			};

			update(toasts => [...toasts, newToast]);

			// Auto-remove after duration
			setTimeout(() => {
				update(toasts => 
					toasts.map(t => 
						t.id === id ? { ...t, entering: false, exiting: true } : t
					)
				);
				
				// Remove from store after animation
				setTimeout(() => {
					update(toasts => toasts.filter(t => t.id !== id));
				}, 300);
			}, newToast.duration);

			return id;
		},
		remove: (id) => {
			update(toasts => 
				toasts.map(t => 
					t.id === id ? { ...t, entering: false, exiting: true } : t
				)
			);
			
			// Remove from store after animation
			setTimeout(() => {
				update(toasts => toasts.filter(t => t.id !== id));
			}, 300);
		},
		clear: () => set([]),
		// Convenience methods
		success: (message, duration) => {
			return toastStore.add({ type: 'success', message, duration });
		},
		error: (message, duration) => {
			return toastStore.add({ type: 'error', message, duration });
		},
		warning: (message, duration) => {
			return toastStore.add({ type: 'warning', message, duration });
		},
		info: (message, duration) => {
			return toastStore.add({ type: 'info', message, duration });
		}
	};
}

export const toastStore = createToastStore();

// Convenience functions for easy importing
export const showToast = (toast) => toastStore.add(toast);
export const showSuccess = (message, duration) => toastStore.add({ type: 'success', message, duration });
export const showError = (message, duration) => toastStore.add({ type: 'error', message, duration });
export const showWarning = (message, duration) => toastStore.add({ type: 'warning', message, duration });
export const showInfo = (message, duration) => toastStore.add({ type: 'info', message, duration });