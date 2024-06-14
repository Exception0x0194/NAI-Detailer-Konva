<template>
  <div>
    I2I input size:
    <select v-model="selectedSize">
      <option value="832x1216">832 x 1216</option>
      <option value="1024x1024">1024 x 1024</option>
      <option value="1216x832">1216 x 832</option>
    </select>
    <br>
    Border Width (px): <input type="range" min="0" max="50" v-model.number="borderPixels"> {{ borderPixels }}
    <br>
    <button @click="addFeatheredRectToKonva">Add White Rectangle with Feathering</button>
    <br>
    <div v-if="this.rect">
      Selected size: {{ Math.round(cropWidth / this.scale) }} x {{ Math.round(cropHeight / this.scale) }}
    </div>
    <br>
    <button @click="uploadImage">Upload Image</button>
    <br>
    <div ref="container"></div>
  </div>
</template>


<script>
import Konva from 'konva';
import VueKonva from 'vue-konva';

export default {
  components: {
    VueKonva
  },
  data() {
    return {
      image: null,
      selectedSize: '1024x1024',
      i2iWidth: 1024,
      i2iHeight: 1024,
      cropWidth: 512,
      cropHeight: 512,
      borderPixels: 0,
      stage: null,
      layer: null,
      rect: null,
      transformer: null
    };
  },
  mounted() {
    this.stage = new Konva.Stage({
      container: this.$refs.container,
      width: window.innerWidth,
      height: window.innerHeight
    });
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);
  },
  watch: {
    selectedSize(newValue) {
      const [width, height] = newValue.split('x').map(Number);
      this.i2iWidth = width;
      this.i2iHeight = height;
      this.updateRectSize();
    },
    borderPixels(newValue) {
      this.borderPixels = newValue;
      // console.log(newValue);
      this.updateBorder();
    }
  },
  methods: {
    uploadImage() {
      let input = document.createElement('input');
      input.type = 'file';
      input.onchange = (e) => {
        const target = e.target;
        const file = target.files ? target.files[0] : null;
        if (file) {
          let reader = new FileReader();
          reader.onload = (e) => {
            let img = new Image();
            img.onload = () => {
              this.setupCanvas(img);
            };
            img.src = reader.result;
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    },
    setupCanvas(img) {
      this.layer.destroyChildren(); // 清除所有子元素
      this.image = img;

      // 计算缩放比例以适应画板
      const scaleX = this.stage.width() / img.width;
      const scaleY = this.stage.height() / img.height;
      this.scale = Math.min(scaleX, scaleY, 1); // 不放大图片

      let konvaImage = new Konva.Image({
        image: img,
        x: 0,
        y: 0,
        width: img.width * this.scale,
        height: img.height * this.scale
      });
      this.layer.add(konvaImage);
      this.addCropRect();
    },
    addCropRect() {
      if (this.rect) {
        this.rect.destroy();
        this.transformer.destroy();
      }

      this.rect = new Konva.Rect({
        fill: 'rgba(0,0,255,0.5)',
        draggable: true,
        stroke: 'rgba(255,0,0,0.5)',
        strokeWidth: this.borderPixels * this.scale
      });
      this.layer.add(this.rect);

      this.rect.on('dragmove', () => {
        // 限制拖拽范围
        const rectX = this.rect.x();
        const rectY = this.rect.y();
        const rectWidth = this.rect.width() * this.rect.scaleX();
        const rectHeight = this.rect.height() * this.rect.scaleY();
        const imageWidth = this.image.width * this.scale;
        const imageHeight = this.image.height * this.scale;
        const newX = Math.min(Math.max(0, rectX), imageWidth - rectWidth);
        const newY = Math.min(Math.max(0, rectY), imageHeight - rectHeight);
        this.rect.x(newX);
        this.rect.y(newY);
      });

      this.rect.on('transformend', () => {
        //限制缩放范围
        const rectScale = this.rect.scaleX();
        const imageWidth = this.image.width * this.scale;
        const imageHeight = this.image.height * this.scale;
        const rectX = this.rect.x();
        const rectY = this.rect.y();
        const newScale = Math.min(rectScale, (imageHeight - rectY) / this.rect.height(), (imageWidth - rectX) / this.rect.width());
        this.rect.width(newScale * this.rect.width());
        this.rect.height(newScale * this.rect.height());
        this.rect.scaleX(1);
        this.rect.scaleY(1);
        // 更新尺寸显示
        this.cropWidth = Math.round(this.rect.width());
        this.cropHeight = Math.round(this.rect.height());
        this.layer.draw();
      });

      this.transformer = new Konva.Transformer({
        keepRatio: true,
        rotateEnabled: false,
        enabledAnchors: ['bottom-right'],
        minWidth: 10,
        minHeight: 10
      });
      this.layer.add(this.transformer);
      this.transformer.attachTo(this.rect);
      this.updateRectSize();
      this.layer.draw();
    },
    updateRectSize() {
      const ratio = this.i2iHeight / this.i2iWidth;
      const imageWidth = this.image.width * this.scale;
      const imageHeight = this.image.height * this.scale;
      const width = Math.min(imageWidth, imageHeight / ratio) / 2;
      const height = Math.min(imageHeight, imageWidth * ratio) / 2;
      this.cropWidth = width;
      this.cropHeight = height;

      this.rect.width(width);
      this.rect.height(height);
      this.rect.x(width / 10);
      this.rect.y(height / 10);
      this.rect.scaleX(1);
      this.rect.scaleY(1);
      this.layer.draw();
    },
    updateBorder() {
      // this.layer.draw();
    },
    createFeatheredRectangle(width, height, featherWidth) {
      // 创建一个canvas元素
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // 创建ImageData用于像素操作
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;

      // 填充像素
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4; // 每个像素点4个byte，索引位置
          const distanceX = Math.min(x, width - x - 1); // 距离左右边界最近的距离
          const distanceY = Math.min(y, height - y - 1); // 距离上下边界最近的距离
          const distanceToEdge = Math.min(distanceX, distanceY); // 距离最近边界的距离
          const alpha = Math.min(1, distanceToEdge / featherWidth); // 计算透明度
          data[index] = 255;
          data[index + 1] = 255
          data[index + 2] = 255
          data[index + 3] = alpha * 255; // alpha, 从0 (完全透明) 到255 (完全不透明)
        }
      }

      // 将修改后的ImageData对象放回canvas中
      ctx.putImageData(imageData, 0, 0);

      return canvas;
    },
    addFeatheredRectToKonva() {
      // 假设rect已经定义并包含x, y, width, height
      const featherWidth = 20; // 你可以根据需要调整这个羽化宽度
      const canvas = this.createFeatheredRectangle(this.rect.width(), this.rect.height(), featherWidth);

      // 使用Canvas作为Konva.Image的图像源
      const image = new Konva.Image({
        x: this.rect.x(),
        y: this.rect.y(),
        image: canvas,
        width: this.rect.width(),
        height: this.rect.height(),
      });

      // 将图片添加到层上
      this.layer.add(image);
      this.layer.draw();
    }
  }
};
</script>

<style scoped></style>