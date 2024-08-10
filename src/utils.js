import { canvasRGBA } from 'stackblur-canvas';

export function blurAlphaChannel(canvas, radius) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // 获取原始画布的图像数据
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    // 创建一个新的画布来处理透明度数据
    const alphaCanvas = document.createElement('canvas');
    alphaCanvas.width = width;
    alphaCanvas.height = height;
    const alphaCtx = alphaCanvas.getContext('2d');
    const alphaData = alphaCtx.createImageData(width, height);
    const alphaPixels = alphaData.data;

    // 复制透明度数据到新的画布，并设置 RGB 通道为白色（或黑色，根据需求）
    for (let i = 0; i < pixels.length; i += 4) {
        alphaPixels[i] = 255; // R
        alphaPixels[i + 1] = 255; // G
        alphaPixels[i + 2] = 255; // B
        alphaPixels[i + 3] = pixels[i + 3]; // Alpha
    }
    alphaCtx.putImageData(alphaData, 0, 0);

    // 对透明度画布应用高斯模糊
    canvasRGBA(alphaCanvas, 0, 0, width, height, radius);

    // 重新获取模糊后的像素数据
    const blurredData = alphaCtx.getImageData(0, 0, width, height);
    const blurredPixels = blurredData.data;

    // 将模糊后的透明度数据合并回原始图像数据
    for (let i = 3; i < pixels.length; i += 4) {
        // if (pixels[i] != 0)
        pixels[i] = blurredPixels[i];
    }

    // 更新原始画布
    ctx.putImageData(imageData, 0, 0);
}

