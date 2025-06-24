import Database from 'better-sqlite3';

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
            appSettings: settingsObj
        };
    } catch (error) {
        console.error('Error loading app settings:', error);
        db.close();
        
        // Return default settings if database doesn't exist yet
        return {
            appSettings: {
                accent_color: '#f39407',
                theme_mode: 'dark',
                favicon_path: '/favicon.png',
                logo_type: 'emoji',
                logo_value: '🏋️'
            }
        };
    }
}