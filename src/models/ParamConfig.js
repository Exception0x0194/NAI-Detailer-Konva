class ParamConfig {
    constructor() {
        const savedConfig = localStorage.getItem('paramConfig');
        const defaultValues = {
            prompt: 'best quality, amazing quality, very aesthetic, absurdres',
            uc: 'lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract], bad anatomy, bad hands',
            width: 1024,
            height: 1024,
            scale: 6.5,
            sampler: 'k_euler_ancestral',
            steps: 28,
            randomSeed: true,
            seed: 0,
            nSamples: 1,
            ucPreset: 0,
            qualityToggle: true,
            sm: true,
            smDyn: true,
            dynamicThresholding: false,
            controlNetStrength: 1.0,
            legacy: false,
            addOriginalImage: false,
            uncondScale: 1.0,
            cfgRescale: 0.1,
            noiseSchedule: 'native'
        };

        if (savedConfig) {
            Object.assign(this, JSON.parse(savedConfig));
        } else {
            Object.assign(this, defaultValues);
        }
    }

    save() {
        localStorage.setItem('paramConfig', JSON.stringify(this));
    }
}
