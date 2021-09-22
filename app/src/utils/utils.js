import EXIF from 'exif-js';

// const MAX_WIDTH = 1000;
// const MAX_HEIGHT = 700;
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 750;

export async function resizeImage(imagePath, width = 0, height = 0) {
  let newDimensions = { width: 1, height: 1 };

  let i = new Image();
  i.src = imagePath;

  return new Promise((resolve, reject) => {
    i.onload = () => {
      if (width != 0 && height != 0) {
        // set width and height to given width and height
        newDimensions['width'] = width;
        newDimensions['height'] = height;
      } else {
        // find new dimensions which respect the aspect ratio
        newDimensions.width = i.width;
        newDimensions.height = i.height;
        const aspectRatio = i.width / i.height;
        if (i.width > MAX_WIDTH) {
          newDimensions.width = MAX_WIDTH;
          newDimensions.height = (aspectRatio ** -1) * MAX_WIDTH;
        }
        if (i.height > MAX_HEIGHT) {
          newDimensions.height = MAX_HEIGHT;
          newDimensions.width = (aspectRatio) * MAX_HEIGHT;
        }
      }
      // create canvas for resized image
      let canvas = document.createElement('canvas');
      canvas.width = Math.floor(newDimensions.width);
      canvas.height = Math.floor(newDimensions.height);
      canvas.getContext('2d').drawImage(i, 0, 0, canvas.width, canvas.height);
      // convert canvas to Blob
      let dataUrl = canvas.toDataURL('image/jpeg', 1.0);
      // let resizedImage = dataURLToBlob(dataUrl);
      resolve(dataUrl);
    }
  });
}

export async function getImageMask(maskPath, width, height) {
  let i = new Image();
  i.src = await resizeImage(maskPath, width, height);
  let array = Array.from({ length: height }, () => Array.from({ length: width }, () => false));
  
  return new Promise((resolve, reject) => {
    i.onload = () => {
      console.log(i);
      let canvas = document.createElement('canvas');
      canvas.width = Math.floor(width);
      canvas.height = Math.floor(height);
      let ctx = canvas.getContext('2d');
      ctx.drawImage(i, 0, 0, canvas.width, canvas.height);
      let imageData = ctx.getImageData(0, 0, width, height);

      for (let x = 0; x < height; x++) {
        for (let y = 0; y < width; y++) {
          // 4 bytes for each channel color and need the a color channel to compute
          array[x][y] = imageData.data[(x * width + y) * 4 + 1] > 0;
        }
      }
      resolve(array);
    }
  });
}

// used to set width/height of canvas and to draw uploaded image onto canvas
export async function drawImage(ctx, image, setWidth, setHeight) {
  // need a Javascript Image object to draw onto canvas
  let i = new Image();
  i.src = image.src;

  // have to wait for image object to load before using its width/height fields
  return new Promise((resolve, reject) => {
    i.onload = () => {
      setWidth(i.width);
      setHeight(i.height);
      resolve(ctx.drawImage(i, 0, 0, i.width, i.height));
    }
  });
}

//used to get the metadata tags of an image in js, instead of having to send a request from the python API
export async function getMetadataTags(image) {

  return new Promise((resolve, reject) => {
    //var allData = EXIF.getAllTags(this);

    EXIF.getData(image, function () {
      //var ex= EXIF.pretty(this); //this is a string and pretty print
      var ex = EXIF.getAllTags(this); //THIS is a dictionary

      // recommended begin
      var rec_list = ["make", "model", "gps", "maker", "note", "location", "name",
        "date", "time", "description", "software", "device",
        "longitude", "latitude", "altitude"]
      var found = {};
      if (ex) {
        for (let tag in ex) {
          let t = tag.toLowerCase();
          for (const rec of rec_list) {
            if (t.includes(rec)) {
              found[tag] = EXIF.getTag(this, tag); //add to found dictionary tag:description pairs
            }
          }
        }
      }
      resolve(found);
      //recommended end
    });
    //}
  });
}

export async function convertMask2dToImage(mask) {
  let width = mask[0].length;
  let height = mask.length;
  // the (* 4) at the end represents RGBA which is needed to be compatible with canvas
  let buffer = new Uint8ClampedArray(width * height * 4);

  let canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');

  canvas.width = width;
  canvas.height = height;

  buffer = await fillBuffer(buffer, width, height, mask);

  return new Promise((resolve, reject) => {
    var idata = ctx.createImageData(width, height);
    idata.data.set(buffer);

    ctx.putImageData(idata, 0, 0);

    var dataUri = canvas.toDataURL('image/jpeg');
    let maskedImage = dataURLToBlob(dataUri);

    // var image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");  // here is the most important part because if you dont replace you will get a DOM 18 exception.
    // window.location.href = image; // it will save locally

    resolve(maskedImage);
    reject('image was not masked');
  });
}

let fillBuffer = async (buffer, width, height, mask) => {
  
  // fill the buffer with some data
  for (let x = 0; x < height; x++) {
    for (let y = 0; y < width; y++) {
      let pos = (x * width + y) * 4;
      // paint black if element is false
      if (!mask[x][y]) {
        buffer[pos] = 0;
        buffer[pos + 1] = 0;
        buffer[pos + 2] = 0;
        buffer[pos + 3] = 255;
      } else {
        buffer[pos] = 255;
        buffer[pos + 1] = 255;
        buffer[pos + 2] = 255;
        buffer[pos + 3] = 255;
      }
    }
  }
  return new Promise((resolve, reject) => {
    resolve(buffer);
    reject('Buffer was not filled');
  });
}

let dataURLToBlob = function (dataURL) {
  var BASE64_MARKER = ';base64,';
  if (dataURL.indexOf(BASE64_MARKER) == -1) {
    var parts = dataURL.split(',');
    var contentType = parts[0].split(':')[1];
    var raw = parts[1];

    return new Blob([raw], { type: contentType });
  }

  var parts = dataURL.split(BASE64_MARKER);
  var contentType = parts[0].split(':')[1];
  var raw = window.atob(parts[1]);
  var rawLength = raw.length;

  var uInt8Array = new Uint8Array(rawLength);

  for (var i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

function base64urlToBase64(base64url) {
  var base64 = base64url.replace(/-/,"+").replace(/_/, "/");
  if (base64.length % 4 != 0) {
      base64.concat(new Array(4 - base64.length % 4).join( "=" ));
      // base64.concat(String(repeating: "=", count: 4 - base64.length % 4))
  }
  return base64
}