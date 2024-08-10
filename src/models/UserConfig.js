class UserConfig {
    constructor() {
        const savedConfig = localStorage.getItem('userConfig');
        const defaultConfig = { token: 'pst-abc' };

        if (savedConfig) {
            Object.assign(this, JSON.parse(savedConfig));
        } else {
            Object.assign(this, defaultConfig);
        }
    }

    save() {
        localStorage.setItem('userConfig', JSON.stringify(this));
    }
}
