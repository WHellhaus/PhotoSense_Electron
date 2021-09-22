import React from "react";
import Paper from '@material-ui/core/Paper'; 
import Canvas from '../../components/Canvas/Canvas.jsx';
import imgIcon from '../../../../resources/icon.png';

import { useSelector, useDispatch } from 'react-redux';
import { add_canvas } from '../../redux/components/canvas/canvasSlice';
import { useEffect } from "react";


function About() {
  const canvases = useSelector((state) => state.canvas);
  console.log(canvases)
  const dispatch = useDispatch();

  function getDimensions(image) {
    return new Promise((resolve) => {
      image.onload = () => {
        resolve({'width': image.width, 'height': image.height});
      }
    });
  }

  useEffect(async () => {
    let i = new Image();
    i.src = imgIcon;
    let dimensions = await getDimensions(i);
    console.log(dimensions);
    if (canvases.length == 0) {
      dispatch(add_canvas(dimensions))
    }
  }, [imgIcon])

  return (
    <section className="section">
        <div className="container">
            <h1 className="title is-1">About</h1>
        </div>
        <div className="container mt-2">
            This template's origins arise from my work on My Budget (https://github.com/reZach/my-budget) beginning in 2019. I was building a free Electron application to manage your budget, and was doing the best I could to use and learn Electron. After I spent more time working on the project, I realized the practices I were using were not secure, and decided I needed to build an Electron template that could be used for the new (v2) budgeting application.
        </div>
        <div className="container mt-2">
            As I began to work more and more on this template, my focus changed from building a budgeting app to making a secure electron template. Many people have offered their expertise and knowledge in making this template to the one it is today. To these people I say, thank you. I hope you make use of this template by building a wonderfully secure application!
        </div>

        {canvases.length > 0 && <Paper>
          <Canvas image={[imgIcon]} setCoordsPass={(x) => x} />
        </Paper>}
    </section>
  );
}

export default About;
