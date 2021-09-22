import { useState, useEffect, useRef } from 'react';

export function redraw(ctx, coords) {
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2;
  if (coords.length === 0) {
    return;
  }

  const lastIndex = coords.length - 1;

  coords.forEach((coord, index) => {
    if (!coord.drag) {
      if (index === 0) {
        ctx.beginPath();
        ctx.moveTo(coord.x, coord.y);
        ctx.lineTo(coord.x, coord.y);
        ctx.stroke();
      }
      // if this is just a different path
      else {
        ctx.fill();
        ctx.closePath();
        ctx.moveTo(coord.x, coord.y);
        ctx.beginPath();
        ctx.lineTo(coord.x, coord.y);
        ctx.stroke();
      }
    } else {
      ctx.lineTo(coord.x, coord.y);
      ctx.stroke();
      if (index === lastIndex) {
        ctx.fill();
        ctx.closePath();
      }
    }

  })
}

export function setStyles(ctx, params) {
  ctx.fillStyle = 'fillStyle' in params ? params.fillStyle : ctx.fillStyle;
  ctx.strokeStyle = 'strokeStyle' in params ? params.strokeStyle : ctx.strokeStyle;
  ctx.globalAlpha = 'globalAlpha' in params ? params.globalAlpha : ctx.globalAlpha;
  ctx.globalCompositeOperation = 'globalCompositeOperation' in params ? params.globalCompositeOperation : ctx.globalCompositeOperation;
}

// only use for drawing the last element added to array
export function draw(ctx, coords) {
  ctx.fillStyle = "#75c2eb4d";
  //console.log(ctx.fillStyle);
  ctx.strokeStyle = '#004ba6';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2;
  if (coords.length === 0) {
    return;
  }

  let i = coords.length - 1
  // if this is the first point of a new path
  if (!coords[i].drag) {
    // if this is the first point being drawn
    if (coords.length === 1) {
      ctx.beginPath();
      ctx.moveTo(coords[i].x, coords[i].y);
      ctx.lineTo(coords[i].x, coords[i].y);
      ctx.stroke();
    }
    // if this is just a different path
    else {
      ctx.moveTo(coords[i].x, coords[i].x);
      ctx.beginPath();
      ctx.lineTo(coords[i].x, coords[i].y);
      ctx.stroke();
    }
  }
  // if this is the continuation of a path
  else {
    ctx.lineTo(coords[i].x, coords[i].y);
    ctx.stroke();
  }
};

export function redrawGrid(ctx, coords) {
  // clear the canvas area before rendering the coordinates held in state
  //ctx.clearRect(0, 0, coords.length, coords[0].length);
  for (let i = 0; i < coords[0].length; i++) {
    for (let j = 0; j < coords.length; j++) {
      if (coords[j][i] > 0) {
        ctx.fillRect(i, j, 1, 1);
      }
    }
  }
}

export function useCanvas() {
  const canvasRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [coordinates, setCoordinates] = useState([[]]);

  // initialize coordinates to be widthxheight matrix of false booleans
  useEffect(() => {
    setCoordinates(Array.from({ length: height }, () => Array.from({ length: width }, () => false)));

    const canvasObj = canvasRef.current;
    const ctx = canvasObj.getContext('2d');
    setStyles(ctx, { 'globalAlpha': 0.3, 'strokeStyle': 'rgba(117, 194, 235, 0.2)', 'fillStyle': 'rgba(117, 194, 235, 0.2)', 'globalCompositeOperation': 'xor' })
  }, [width, height]);

  // use this method for testing
  // useEffect(() => {
  //   console.log(coordinates);
  // }, [coordinates]);

  function drawCircle(ctx, xCenter, yCenter, x, y) {
    ctx.fillRect(xCenter + x, yCenter + y, 1, 1);
    ctx.fillRect(xCenter - x, yCenter + y, 1, 1);
    ctx.fillRect(xCenter + x, yCenter - y, 1, 1);
    ctx.fillRect(xCenter - x, yCenter - y, 1, 1);
    ctx.fillRect(xCenter + y, yCenter + x, 1, 1);
    ctx.fillRect(xCenter - y, yCenter + x, 1, 1);
    ctx.fillRect(xCenter + y, yCenter - x, 1, 1);
    ctx.fillRect(xCenter - y, yCenter - x, 1, 1);
  }

  function drawLine(ctx, x1, y1, x2, y2) {
    let xVal = 0
    let yVal = 0
    xVal = x1 < x2 ? 1 : -1
    yVal = y1 < y2 ? 1 : -1

    while (x1 !== x2) {
      ctx.fillRect(x1, y1, 1, 1);
      x1 += xVal;
    }
    while (y1 !== y2) {
      ctx.fillRect(x1, y1, 1, 1);
      y1 += yVal;
    }
  }

  function circleBres(ctx, xCenter, yCenter, r) {
    let x = 0;
    let y = r;
    let d = 3 - (2 * r);
    drawCircle(ctx, xCenter, yCenter, x, y);
    while (y >= x) {
      // for each pixel we will
      // draw all eight pixels    
      x++;

      // check for decision parameter
      // and correspondingly 
      // update d, x, y
      if (d > 0) {
        y--;
        d = d + 4 * (x - y) + 10;
      } else {
        d = d + 4 * x + 6;
      }
      drawCircle(ctx, xCenter, yCenter, x, y);

      drawLine(ctx, xCenter + x, yCenter + y, xCenter - x, yCenter + y);
      drawLine(ctx, xCenter + y, yCenter + x, xCenter - y, yCenter + x);
      drawLine(ctx, xCenter + x, yCenter - y, xCenter - x, yCenter - y);
      drawLine(ctx, xCenter + y, yCenter - x, xCenter - y, yCenter - x);
    }
    drawLine(ctx, xCenter - r, yCenter, xCenter + r, yCenter);
  }

  function drawPixel(ctx, x, y, radius) {
    //circleBres(ctx, x, y, radius);
    ctx.lineWidth = radius * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  return [coordinates, setCoordinates, canvasRef, width, setWidth, height, setHeight, drawPixel];
}