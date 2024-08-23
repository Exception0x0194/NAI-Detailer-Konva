<template>
  <div class="image-grid-container">
    <div class="input-grid-container grid-container" id="input-container-parent">
      <span>Input</span>
      <div id="input-container"></div>
    </div>
    <div class="mask-grid-container grid-container" id="mask-container-parent">
      <span>Mask</span>
      <div id="mask-container"></div>
    </div>
    <div class="mask-output-container grid-container">
      <span>Output</span>
      <div style=""></div>
    </div>
  </div>
  <div style="display: grid; grid-template-rows: 1fr; gap: 10px; margin: 10px;">
    <!-- I2I input size:
    <select v-model="selectedSize">
      <option value="1024x1024">1024 x 1024</option>
    </select> -->
    <div v-if="this.cropRect">
      Selected position: [{{ cropX }} ~ {{ cropX + cropWidth }}), [{{ cropY }} ~ {{ cropY + cropHeight }})
    </div>
    <button @click="uploadImage">Upload Image</button>
  </div>
</template>

<style>
.image-grid-container {
  display: grid;
  grid-template-columns: repeat(3, 512px);
  max-height: 100%;
  gap: 10px;
}

.image-grid-container .grid-container {
  display: grid;
  grid-template-columns: 1fr;
  text-align: center;
  border: 1px solid grey;
}
</style>


<script>
import Konva from 'konva';
import VueKonva from 'vue-konva';

const canvasWidth = 1024;
const canvasHeight = 1024;
const cropAspect = 1.0;

const brushSize = 100;

function fitStageIntoParentContainer(stage, parentId) {
  var container = document.querySelector('#' + parentId);
  if (container === null) return;

  // fit stage into parent container
  const containerWidth = container.offsetWidth - 2;
  const containerHeight = container.offsetHeight - 2;

  // but we also make the full scene visible
  // so we need to scale all objects on canvas
  const scaleX = containerWidth / canvasWidth;
  const scaleY = containerHeight / canvasHeight;
  const scale = Math.min(scaleX, scaleY)

  stage.width(canvasWidth * scale);
  stage.height(canvasHeight * scale);
  stage.scale({ x: scale, y: scale });
}

function getScaledPointerPosition(stage) {
  const pos = stage.getPointerPosition();
  const scale = stage.scale();
  return { x: pos.x / scale.x, y: pos.y / scale.y };
}

export default {
  components: {
    VueKonva
  },
  data() {
    return {
      // Input stage and crop settings
      inputImage: null,
      inputScale: 1.0,

      inputStage: null,
      inputStageLayer: null,
      cropRect: null,
      cropTransformer: null,

      cropX: 0,
      cropY: 0,
      cropWidth: 512,
      cropHeight: 512,

      // Mask stage
      maskStage: null,
      maskImageLayer: null,
      maskPaintLayer: null,
      isPainting: false,
    };
  },
  mounted() {
    this.inputStage = new Konva.Stage({
      container: 'input-container',
      width: canvasWidth,
      height: canvasHeight
    });
    this.maskStage = new Konva.Stage({
      container: 'mask-container',
      width: canvasWidth,
      height: canvasHeight
    });
    this.inputStageLayer = new Konva.Layer();
    this.inputStage.add(this.inputStageLayer);
    this.maskImageLayer = new Konva.Layer();
    this.maskStage.add(this.maskImageLayer);
    this.maskPaintLayer = new Konva.Layer({ opacity: 0.5 });
    this.maskStage.add(this.maskPaintLayer);
    // 绘图事件
    var lastLine;
    this.maskStage.on('mousedown touchstart', (e) => {
      this.isPainting = true;
      var pos = getScaledPointerPosition(this.maskStage);
      lastLine = new Konva.Line({
        stroke: 'rgb(255,255,255)',
        strokeWidth: brushSize,
        globalCompositeOperation: 'source-over',
        // round cap for smoother lines
        lineCap: 'round',
        lineJoin: 'round',
        // add point twice, so we have some drawings even on a simple click
        points: [pos.x, pos.y, pos.x, pos.y],
      });
      this.maskPaintLayer.add(lastLine);
    });
    this.maskStage.on('mouseup touchend', () => {
      this.isPainting = false;
    });
    // and core function - drawing
    this.maskStage.on('mousemove touchmove', (e) => {
      if (!this.isPainting) {
        return;
      }
      // prevent scrolling on touch devices
      e.evt.preventDefault();
      const pos = getScaledPointerPosition(this.maskStage);
      var newPoints = lastLine.points().concat([pos.x, pos.y]);
      lastLine.points(newPoints);
    });

    fitStageIntoParentContainer(this.inputStage, 'input-container-parent');
    fitStageIntoParentContainer(this.maskStage, 'mask-container-parent');
    window.addEventListener('resize', () => { fitStageIntoParentContainer(this.inputStage, 'input-container-parent'); fitStageIntoParentContainer(this.maskStage, 'mask-container-parent'); });
  },
  watch: {},
  methods: {
    initInputStage() {

    },
    initMaskStage() {

    },
    uploadImage() {
      let input = document.createElement('input');
      input.type = 'file';
      input.onchange = (e) => {
        const target = e.target;
        if (target === null) return;
        const file = target.files ? target.files[0] : null;
        if (file) {
          let reader = new FileReader();
          reader.onload = (e) => {
            let img = new Image();
            img.onload = () => {
              this.setupInputCanvas(img);
              this.resetMask();
              this.setupMaskBackground();
            };
            img.src = reader.result;
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    },
    setupInputCanvas(img) {
      this.inputStageLayer.destroyChildren(); // 清除所有子元素
      this.inputImage = img;

      // 计算缩放比例以适应画板
      const scaleX = canvasWidth / img.width;
      const scaleY = canvasHeight / img.height;
      this.inputScale = Math.min(scaleX, scaleY, 1); // 不放大图片

      let canvasImage = new Konva.Image({
        image: img,
        x: 0,
        y: 0,
        width: img.width * this.inputScale,
        height: img.height * this.inputScale
      });
      this.inputStageLayer.add(canvasImage);
      this.addCropRect();
    },
    addCropRect() {
      if (this.cropRect) {
        this.cropRect.destroy();
        this.cropTransformer.destroy();
      }

      this.cropRect = new Konva.Rect({
        fill: 'rgba(0,0,255,0.5)',
        draggable: true,
      });
      this.inputStageLayer.add(this.cropRect);

      this.cropRect.on('dragend', () => {
        // 限制拖拽范围
        const rectX = this.cropRect.x();
        const rectY = this.cropRect.y();
        const rectWidth = this.cropRect.width();
        const rectHeight = this.cropRect.height();
        const imageWidth = this.inputImage.width * this.inputScale;
        const imageHeight = this.inputImage.height * this.inputScale;
        const newX = Math.min(Math.max(0, rectX), imageWidth - rectWidth);
        const newY = Math.min(Math.max(0, rectY), imageHeight - rectHeight);
        this.cropRect.x(newX);
        this.cropRect.y(newY);
        // 更新裁剪位置
        this.updateCropPos();
        this.setupMaskBackground();
      });

      this.cropRect.on('transformend', () => {
        //限制缩放范围
        const rectScale = this.cropRect.scaleX();
        const imageWidth = this.inputImage.width * this.inputScale;
        const imageHeight = this.inputImage.height * this.inputScale;
        const rectX = this.cropRect.x();
        const rectY = this.cropRect.y();
        const newScale = Math.min(rectScale, (imageHeight - rectY) / this.cropRect.height(), (imageWidth - rectX) / this.cropRect.width());
        this.cropRect.width(newScale * this.cropRect.width());
        this.cropRect.height(newScale * this.cropRect.height());
        this.cropRect.scaleX(1);
        this.cropRect.scaleY(1);
        this.inputStageLayer.draw();
        // 更新裁剪位置
        this.updateCropPos();
        this.setupMaskBackground();
      });

      this.cropTransformer = new Konva.Transformer({
        keepRatio: true,
        rotateEnabled: false,
        enabledAnchors: ['bottom-right'],
        minWidth: 10,
        minHeight: 10
      });
      this.inputStageLayer.add(this.cropTransformer);
      this.cropTransformer.attachTo(this.cropRect);
      this.initRectPos();
      this.inputStageLayer.draw();
    },
    initRectPos() {
      const ratio = cropAspect;
      // Size of image in canvas
      const imageWidth = this.inputImage.width * this.inputScale;
      const imageHeight = this.inputImage.height * this.inputScale;

      const cropWidth = Math.min(imageWidth, imageHeight / ratio) / 2;
      const cropHeight = Math.min(imageHeight, imageWidth * ratio) / 2;

      this.cropRect.width(cropWidth);
      this.cropRect.height(cropHeight);
      this.cropRect.x(cropWidth / 10);
      this.cropRect.y(cropHeight / 10);
      this.cropRect.scaleX(1);
      this.cropRect.scaleY(1);
      this.inputStageLayer.draw();
    },
    updateCropPos() {
      this.cropX = Math.round(this.cropRect.x() / this.inputScale);
      this.cropY = Math.round(this.cropRect.y() / this.inputScale);
      this.cropWidth = Math.round(this.cropRect.width() / this.inputScale);
      this.cropHeight = Math.round(this.cropRect.height() / this.inputScale);
    },
    setupMaskBackground() {
      // Clear background
      this.maskImageLayer.destroyChildren();
      // Create a 1024x1024 image of selection area
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(this.inputImage, this.cropX, this.cropY, this.cropWidth, this.cropHeight, 0, 0, canvasWidth, canvasHeight);
      // Draw background onto stage
      const croppedImage = new Image();
      croppedImage.src = canvas.toDataURL();
      let canvasImage = new Konva.Image({
        image: croppedImage,
        x: 0,
        y: 0,
      })

      this.maskImageLayer.add(canvasImage);
    },
    resetMask(){
      // Clear ueser input
      this.maskPaintLayer.destroyChildren();
    }
  }
};
</script>
