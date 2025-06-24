import Database from 'better-sqlite3';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { fail } from '@sveltejs/kit';

function getDatabase() {
    return new Database('kranos.db');
}

export async function load() {
    const db = getDatabase();
    
    try {
        // Get all settings
        const settings = db.prepare('SELECT setting_key, setting_value FROM app_settings').all();
        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.setting_key] = setting.setting_value;
        });
        
        db.close();
        
        return {
            settings: settingsObj
        };
    } catch (error) {
        console.error('Error loading settings:', error);
        db.close();
        return {
            settings: {
                accent_color: '#f39407',
                theme_mode: 'dark',
                favicon_path: '/favicon.png',
                logo_type: 'emoji',
                logo_value: '🏋️'
            }
        };
    }
}

export const actions = {
    updateAccentColor: async ({ request }) => {
        const formData = await request.formData();
        const color = formData.get('color');
        
        if (!color || !/^#[0-9A-F]{6}$/i.test(color)) {
            return fail(400, { error: 'Invalid color format' });
        }
        
        const db = getDatabase();
        
        try {
            const updateSetting = db.prepare(`
                UPDATE app_settings 
                SET setting_value = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE setting_key = ?
            `);
            updateSetting.run(color, 'accent_color');
            db.close();
            
            return { success: true, message: 'Accent color updated successfully' };
        } catch (error) {
            db.close();
            console.error('Error updating accent color:', error);
            return fail(500, { error: 'Failed to update accent color' });
        }
    },
    
    updateTheme: async ({ request }) => {
        const formData = await request.formData();
        const theme = formData.get('theme');
        
        if (!theme || !['dark', 'light'].includes(theme)) {
            return fail(400, { error: 'Invalid theme mode' });
        }
        
        const db = getDatabase();
        
        try {
            const updateSetting = db.prepare(`
                UPDATE app_settings 
                SET setting_value = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE setting_key = ?
            `);
            updateSetting.run(theme, 'theme_mode');
            db.close();
            
            return { success: true, message: 'Theme updated successfully' };
        } catch (error) {
            db.close();
            console.error('Error updating theme:', error);
            return fail(500, { error: 'Failed to update theme' });
        }
    },
    
    uploadFavicon: async ({ request }) => {
        const formData = await request.formData();
        const file = formData.get('favicon');
        
        if (!file || !(file instanceof File)) {
            return fail(400, { error: 'No favicon file provided' });
        }
        
        // Validate file type
        if (!file.type.startsWith('image/png')) {
            return fail(400, { error: 'Favicon must be a PNG image' });
        }
        
        // Validate file size (100KB limit)
        if (file.size > 100 * 1024) {
            return fail(400, { error: 'Favicon must be smaller than 100KB' });
        }
        
        const db = getDatabase();
        
        try {
            // Create unique filename
            const timestamp = Date.now();
            const filename = `favicon-${timestamp}.png`;
            const filepath = join('static', 'uploads', filename);
            const publicPath = `/uploads/${filename}`;
            
            // Save file
            const buffer = await file.arrayBuffer();
            writeFileSync(filepath, new Uint8Array(buffer));
            
            // Get old favicon path to delete
            const oldSetting = db.prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?').get('favicon_path');
            const oldPath = oldSetting?.setting_value;
            
            // Update database
            const updateSetting = db.prepare(`
                UPDATE app_settings 
                SET setting_value = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE setting_key = ?
            `);
            updateSetting.run(publicPath, 'favicon_path');
            
            // Delete old favicon if it's not the default
            if (oldPath && oldPath !== '/favicon.png' && oldPath.startsWith('/uploads/')) {
                const oldFile = join('static', oldPath);
                if (existsSync(oldFile)) {
                    unlinkSync(oldFile);
                }
            }
            
            db.close();
            
            return { 
                success: true, 
                message: 'Favicon updated successfully',
                favicon_path: publicPath
            };
        } catch (error) {
            db.close();
            console.error('Error uploading favicon:', error);
            return fail(500, { error: 'Failed to upload favicon' });
        }
    },
    
    uploadLogo: async ({ request }) => {
        const formData = await request.formData();
        const file = formData.get('logo');
        
        if (!file || !(file instanceof File)) {
            return fail(400, { error: 'No logo file provided' });
        }
        
        // Validate file type
        if (!file.type.startsWith('image/png')) {
            return fail(400, { error: 'Logo must be a PNG image' });
        }
        
        // Validate file size (1MB limit)
        if (file.size > 1 * 1024 * 1024) {
            return fail(400, { error: 'Logo must be smaller than 1MB' });
        }
        
        const db = getDatabase();
        
        try {
            // Create unique filename
            const timestamp = Date.now();
            const filename = `logo-${timestamp}.png`;
            const filepath = join('static', 'uploads', filename);
            const publicPath = `/uploads/${filename}`;
            
            // Save file
            const buffer = await file.arrayBuffer();
            writeFileSync(filepath, new Uint8Array(buffer));
            
            // Get old logo path to delete
            const oldTypeSetting = db.prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?').get('logo_type');
            const oldValueSetting = db.prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?').get('logo_value');
            
            // Update database - change to image type and set path
            const updateType = db.prepare(`
                UPDATE app_settings 
                SET setting_value = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE setting_key = ?
            `);
            const updateValue = db.prepare(`
                UPDATE app_settings 
                SET setting_value = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE setting_key = ?
            `);
            
            updateType.run('image', 'logo_type');
            updateValue.run(publicPath, 'logo_value');
            
            // Delete old logo if it was an image
            if (oldTypeSetting?.setting_value === 'image' && oldValueSetting?.setting_value?.startsWith('/uploads/')) {
                const oldFile = join('static', oldValueSetting.setting_value);
                if (existsSync(oldFile)) {
                    unlinkSync(oldFile);
                }
            }
            
            db.close();
            
            return { 
                success: true, 
                message: 'Logo updated successfully',
                logo_type: 'image',
                logo_value: publicPath
            };
        } catch (error) {
            db.close();
            console.error('Error uploading logo:', error);
            return fail(500, { error: 'Failed to upload logo' });
        }
    },
    
    resetToDefaults: async () => {
        const db = getDatabase();
        
        try {
            // Get current logo and favicon paths for cleanup
            const settings = db.prepare('SELECT setting_key, setting_value FROM app_settings').all();
            const currentSettings = {};
            settings.forEach(s => {
                currentSettings[s.setting_key] = s.setting_value;
            });
            
            // Reset to defaults
            const resetSettings = [
                ['accent_color', '#f39407'],
                ['theme_mode', 'dark'],
                ['favicon_path', '/favicon.png'],
                ['logo_type', 'emoji'],
                ['logo_value', '🏋️']
            ];
            
            const updateSetting = db.prepare(`
                UPDATE app_settings 
                SET setting_value = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE setting_key = ?
            `);
            
            resetSettings.forEach(([key, value]) => {
                updateSetting.run(value, key);
            });
            
            // Clean up uploaded files
            if (currentSettings.favicon_path && currentSettings.favicon_path.startsWith('/uploads/')) {
                const faviconFile = join('static', currentSettings.favicon_path);
                if (existsSync(faviconFile)) {
                    unlinkSync(faviconFile);
                }
            }
            
            if (currentSettings.logo_type === 'image' && currentSettings.logo_value?.startsWith('/uploads/')) {
                const logoFile = join('static', currentSettings.logo_value);
                if (existsSync(logoFile)) {
                    unlinkSync(logoFile);
                }
            }
            
            db.close();
            
            return { success: true, message: 'Settings reset to defaults successfully' };
        } catch (error) {
            db.close();
            console.error('Error resetting settings:', error);
            return fail(500, { error: 'Failed to reset settings' });
        }
    }
};