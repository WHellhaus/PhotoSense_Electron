import React, { useState, useEffect, useRef } from 'react';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import Paper from '@material-ui/core/Paper';
import Grid from '@material-ui/core/Grid';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import Slider from '@material-ui/core/Slider';
import BrushSizeDisplay from './BrushSize.js';
import { drawImage } from '../../utils/utils.js';
import Cursor from '../../utils/cursor.js';
import { useCanvas, redrawGrid, setStyles } from '../../hooks/useCanvas.js';
import clsx from 'clsx';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
  },
  paper: {
    position: "relative",
  },
  canvas: {
    border: "2px solid",
    borderColor: theme.palette.action.active,
    top: 0,
    left: 0,
    touchAction: 'none',
  },
  toolbarButton: {
    marginLeft: "10px",
    width: "120px",
    fontWeight: "bold",
    color: "#181818",
    backgroundColor: "#eceff1",
    marginBottom: '10px'
  },
  pagination: {
    color: 'white',
    position: 'absolute',
    bottom: '35px'
  },
  toolbarGrid: {
    margin: 'auto',
    marginTop: 0,
    // marginBottom: 10
  },
  toolbarSlider: {
    maxWidth: 200,
    paddingBottom: 55,
    marginRight: 20,
  },
  mobileSlider: {
    maxWidth: 100,
    paddingBottom: 55,
    marginRight: 15,
    marginLeft: 5
  }
}));

function Canvas({ image = new Image(), coordsPass = [[]], setCoordsPass }) {
  const classes = useStyles();

  // Canvas Hooks
  const [coordinates, setCoordinates, canvasRef, width, setWidth, height, setHeight, drawPixel] = useCanvas();
  const [paint, setPaint] = useState(false);
  // const [rect, setRect] = useState({});

  // Image Hooks
  const imageCanvasRef = useRef(null);

  // Toolbar Hooks
  const [mode, setMode] = useState(1); // true => Draw, false => Erase
  const [radius, setRadius] = useState(10);

  // Cursor Hooks
  const [showCursor, setShowCursor] = useState(false);

  const theme = useTheme();
  const matchesLgDisplay = useMediaQuery(theme.breakpoints.up('sm'));

  // used to set the rect object (the bounding client rectangle used to find offsets)
  useEffect(() => {
    document.querySelector("#canvas").addEventListener('dialogClose', (e) => {setShowCursor(true)}, false);
    if (coordsPass[0].length === width) {
      let ctx = canvasRef.current.getContext('2d');
      setStyles(ctx, { 'globalAlpha': 0.5, 'strokeStyle': 'rgba(117, 194, 235, 255)', 'fillStyle': 'rgba(117, 194, 235, 255)', 'globalCompositeOperation': 'xor' })
      redrawGrid(ctx, coordsPass);
    }
  }, [canvasRef, width, height]);

  // used to set width/height of canvas and to draw uploaded image onto canvas
  useEffect(() => {
    drawImage(imageCanvasRef.current.getContext('2d'), image, setWidth, setHeight);
    // dependencies so useEffect is not constantly reran
  }, [image, imageCanvasRef, setWidth, setHeight])

  // used to set coordinates based on image data (to optimize performance)
  const imgDataToCoordinates = () => {
    const canvasObj = canvasRef.current;
    const ctx = canvasObj.getContext('2d');
    let imageData = ctx.getImageData(0, 0, width, height);
    let copy = [...coordsPass];
    for (let x = 0; x < height; x++) {
      for (let y = 0; y < width; y++) {
        // 4 bytes for each channel color and need the 4th channel (alpha) to compute
        copy[x][y] = imageData.data[(x * width + y) * 4 + 4] > 0;
        // this if statement can be used as well to track changes between states
        // if (copy[x][y] != Math.min(imageData.data[(x * width + y) * 4 + 4], 1)) {
        //   copy[x][y] = !copy[x][y];
        // }
      }
    }
    setCoordinates(copy);
    setCoordsPass(copy);
  }

  const handleToolbarClick = (event, newMode) => {
    if (newMode !== null) {
      setMode(newMode);
      const ctx = canvasRef.current.getContext('2d');
      if (newMode) {
        setStyles(ctx, { 'globalAlpha': 0.3, 'strokeStyle': 'rgba(117, 194, 235, 0.2)', 'fillStyle': 'rgba(117, 194, 235, 0.2)', 'globalCompositeOperation': 'xor' })
      } else {
        setStyles(ctx, { 'globalAlpha': 1, 'strokeStyle': 'rgba(0, 0, 0, 1)', 'fillStyle': 'rgba(0, 0, 0, 1)', 'globalCompositeOperation': 'destination-out' })
      }
    }
  }

  const handleRadiusSliderChange = (event, newValue) => {
    if (newValue >= 10 && newValue <= 50) {
      setRadius(newValue);
    }
  }

  const handleCanvasClick = (event) => {
    let rect = canvasRef.current.getBoundingClientRect();
    let x,y=0;
    if (event.touches) {
      x = Math.floor(event.touches[0].pageX - rect.left - window.pageXOffset);
      y = Math.floor(event.touches[0].pageY - rect.top - window.pageYOffset);
    } else {
      x = Math.floor(event.pageX - rect.left - window.pageXOffset);
      y = Math.floor(event.pageY - rect.top - window.pageYOffset);
    }

    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x - 0.0001, y - 0.0001);
    drawPixel(ctx, x, y, radius);
    drawPixel(ctx, x, y, radius);
    drawPixel(ctx, x, y, radius);
    drawPixel(ctx, x, y, radius);
    //drawPixel(ctx, x+1, y+1, radius);
    setPaint(true);
  }

  const handleMouseMove = (event) => {
    let rect = canvasRef.current.getBoundingClientRect();
      let x,y = 0;
      if (event.touches) {
        x = Math.floor(event.touches[0].pageX - rect.left - window.pageXOffset);
        y = Math.floor(event.touches[0].pageY - rect.top - window.pageYOffset);
      } else {
        x = Math.floor(event.pageX - rect.left - window.pageXOffset);
        y = Math.floor(event.pageY - rect.top - window.pageYOffset);

        let mouseCursor = document.querySelector("#cursor");
        mouseCursor.style.top = event.pageY + "px";
        mouseCursor.style.left = event.pageX + "px";
      }
    // if the mouse is still down, after the user has clicked once already
    if (paint) {
      const ctx = canvasRef.current.getContext('2d');
      drawPixel(ctx, x, y, radius);
    }
  }

  const handleMouseUp = () => {
    if (paint) {
      imgDataToCoordinates();
    }
    setPaint(false);
  }

  const handleMouseExitCanvas = () => {
    if (paint) {
      imgDataToCoordinates();
    }
    setPaint(false);
    setShowCursor(false);
  }

  return (
    <div className={classes.root}>
      {showCursor && <Cursor size={radius} />}
      <Grid container direction="row" justifyContent="center" alignItems="center" className={classes.toolbarGrid}>
        <Grid item xs={3} md={2}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={handleToolbarClick}
            aria-label="tool toggle">
            <ToggleButton value={1} aria-label="draw tool">
              <i className="fas fa-pen"></i>
            </ToggleButton>
            <ToggleButton value={0} aria-label="draw tool">
              <i className="fas fa-eraser"></i>
            </ToggleButton>
          </ToggleButtonGroup>
        </Grid>
        <Grid item xs={9} md={10}>
          <Slider value={radius} onChange={handleRadiusSliderChange}
            min={10} max={50} aria-labelledby="radius slider" className={clsx({[classes.toolbarSlider]: matchesLgDisplay, [classes.mobileSlider]: !matchesLgDisplay})}>
          </Slider>
          <BrushSizeDisplay radius={radius} />
        </Grid>
      </Grid>


      <Grid container spacing={0} justifyContent="center">
        <Paper className={classes.paper} elevation={3} style={{width: width, height: height}}>
          <canvas
            id="image-canvas"
            className={classes.canvas}
            ref={imageCanvasRef}
            width={width}
            height={height}
            style={{ zIndex: 0 }}
          />
          <canvas
            id="canvas"
            className={classes.canvas}
            ref={canvasRef}
            width={width}
            height={height}
            onMouseDown={handleCanvasClick}
            onTouchStart={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onTouchMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
            onMouseLeave={handleMouseExitCanvas}
            
            onMouseEnter={() => {setShowCursor(true)}}
            style={{ zIndex: 1, position: 'absolute' }}
          />
        </Paper>
      </Grid>
    </div>
  );
}

export default Canvas;
