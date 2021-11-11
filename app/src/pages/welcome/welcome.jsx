import React, {useEffect, useState} from "react";
// import ROUTES from "Constants/routes";
// import { Link } from "react-router-dom";
import { makeStyles } from '@material-ui/core/styles';
import clsx from 'clsx';
import Dropzone from 'react-dropzone';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import CanvasPagination from '../../components/Canvas/CanvasPagination.jsx';
import { resizeImage, getImageMask, getMetadataTags } from '../../utils/utils.js';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    '& > * + *': {
      marginTop: theme.spacing(2),
    },
  },
  center: {
    display: 'block',
    marginLeft: 'auto',
    marginRight: 'auto',
    width: '50%'
  },
  dropOutline: {
    height: '20vh',
    width: '50vw',
    borderStyle: 'dashed',
    borderRadius: '10px',
    marginTop: '20px'
  },
  link: {
    textDecorationLine: 'underline !important',
    color: theme.palette.text.primary
  }
}));

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

function getImageDimensions(file) {
  return new Promise (function (resolved, rejected) {
    var i = new Image()
    i.onload = function(){
      resolved({width: i.width, height: i.height})
    };
    i.src = file
  })
}

function Welcome()  {
  const classes = useStyles();
  const [imageNames, setImageNames] = useState([]);
  const [imageUploadLevel, setImageLevel] = useState(0); // 0 = not uploaded, 1 = uploaded, 2 = segmentation finished
  const [imageMasks, setImageMasks] = useState([]);
  const [resizedImages, setResizedImages] = useState([]);
  const [tempFolder, setTempFolder] = useState("");
  const [alertOpen, setAlert] = useState(false);

  const onDropAccepted = async (acceptedFiles) => {
    // render progress indicator after image is uploaded
    setImageLevel(1);
    let file_paths = acceptedFiles.map(file => file.path);
    
    
    let data = await window.api.send('filePath', file_paths);
    console.log(`Receive ${data} from main process`);
    if (data == 1) {
      console.log('error')
      setAlert(true);
      return;
    } else {
      console.log(data);
      setTempFolder(data['temp_path']);
      file_paths = data['file_names'];
    }
    console.log(tempFolder);
    console.log(data['temp_path']);
    console.log(file_paths);
    setImageNames(file_paths);
    // resize images into new width and height if needed
    let imageArray = []
    for(let idx = 0; idx < file_paths.length; idx++) {
      console.log(data['temp_path']+'/uploadedImages/'+file_paths[idx])
      let i = new Image();
      i.src = await resizeImage('file:///'+data['temp_path']+'/uploadedImages/'+file_paths[idx]);
      imageArray.push(i);
    }
    imageArray = await Promise.all(imageArray);
    setResizedImages(imageArray);
    // resize masks made by cv model into new dimensions from earlier
    let tempArray = []
    for(let idx = 0; idx < file_paths.length; idx++) {
      console.log(imageArray[idx]);
      let dims = await getImageDimensions(imageArray[idx].src);
      tempArray.push(getImageMask('file:///'+data['temp_path']+'/maskImages/'+file_paths[idx], dims.width, dims.height))
    }
    tempArray = await Promise.all(tempArray);
    console.log(tempArray);
    setImageMasks(tempArray);
    setImageLevel(2);
  };

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setAlert(false);
  };

  function switchRenderer(param) {
    switch(param) {
      case 0:
        return (
          <Dropzone
            accept="image/jpeg, image/png"
            onDropAccepted={onDropAccepted}
            onDropRejected={() => alert('Only JPEG and PNG image file types are accepted')}
            maxSize={10485760}
          >
            {({ getRootProps, getInputProps }) => (
              <section>
                <div {...getRootProps()} className={clsx(classes.center, classes.dropOutline)}>
                  <input {...getInputProps()} />
                  <p style={{ textAlign: 'center' }}>
                    Drag 'n' drop some files here, or click to select files <br></br>
                    <em>(Only Jpeg and PNG images  will be accepted)</em>
                  </p>
                </div>
              </section>
            )}
          </Dropzone>
        );
      case 1:
        return (
          <div></div>
        );
      case 2:
        return (
          <div>
            <CanvasPagination imagePaths={imageNames} imageMasks={imageMasks} resizedImages={resizedImages} tempFolder={tempFolder}/>
          </div>
        );
    }
  }

  return (
    <div>
      
      {switchRenderer(imageUploadLevel)}

      <Snackbar open={alertOpen} autoHideDuration={6000} onClose={handleClose}>
        <Alert onClose={handleClose} severity="error">
          An error occured while uploading your images. Please try again later
        </Alert>
      </Snackbar>
    </div>
  );
}

export default Welcome;
