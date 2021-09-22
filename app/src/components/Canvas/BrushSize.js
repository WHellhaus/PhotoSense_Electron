import React, { useEffect, useRef } from 'react';

function drawCircle(ctx, xCenter, yCenter, x, y) {
	ctx.fillRect(xCenter+x, yCenter+y, 1, 1);
	ctx.fillRect(xCenter-x, yCenter+y, 1, 1);
	ctx.fillRect(xCenter+x, yCenter-y, 1, 1);
	ctx.fillRect(xCenter-x, yCenter-y, 1, 1);
	ctx.fillRect(xCenter+y, yCenter+x, 1, 1);
	ctx.fillRect(xCenter-y, yCenter+x, 1, 1);
	ctx.fillRect(xCenter+y, yCenter-x, 1, 1);
	ctx.fillRect(xCenter-y, yCenter-x, 1, 1);
}

function circleBres(ctx, xCenter, yCenter, r) {
	let x = 0;
	let y = r;
	let d = 3 - (2 * r);
	drawCircle(ctx, xCenter, yCenter, x, y);
	while (y >= x)
	{
		// for each pixel we will
		// draw all eight pixels    
		x++;

		// check for decision parameter
		// and correspondingly 
		// update d, x, y
		if (d > 0) {
			y--; 
			d = d + 4 * (x - y);
		} else {
			d = d + 4 * x;
		}
		drawCircle(ctx, xCenter, yCenter, x, y);
	}
}

function BrushSizeDisplay ({ radius }) {
	const brushCanvasRef = useRef(null);

	useEffect(() => {
		let ctx = brushCanvasRef.current.getContext('2d');
    	ctx.fillStyle = 'rgba(255, 255, 255, 1)';
		ctx.clearRect(0,0,110,110);
		circleBres(ctx, 55, 55, radius);
	}, [radius])

	return (
		<canvas ref={brushCanvasRef} width={110} height={110} id='sliderCanvas'></canvas>
	)
}

export default BrushSizeDisplay;