import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router';
import { useTheme, makeStyles } from '@material-ui/core/styles';
import Pagination from '@material-ui/lab/Pagination';
import Grid from '@material-ui/core/Grid';
import Container from '@material-ui/core/Container';
import Button from '@material-ui/core/Button';
import Canvas from './Canvas.jsx';
import CensorshipOptionsDialog from "../Censor_Options/CensorshipOptionsDialog.jsx";
import LinearProgress from '@material-ui/core/LinearProgress';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { convertMask2dToImage, downloadImages, getMetadataTags } from '../../utils/utils.js';
import Paper from '@material-ui/core/Paper';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';

const useStyles = makeStyles((theme) => ({
  pagination: {
    color: 'white',
    // position: 'absolute',
    bottom: '35px',
    marginTop: 25,
  },
  root: {
    width: '100%',
    '& > * + *': {
      marginTop: theme.spacing(2),
    },
  },
  censorButton: {
    width: "155px",
    fontWeight: "bold",
    color: "#181818",
    backgroundColor: "#f18282",
    '&:hover': {
      color: "#181818",
      backgroundColor: '#FAD0D0'
    },
    marginLeft: 10,
  },
  downloadButton: {
    width: "155px",
    fontWeight: "bold",
    color: "#181818",
    backgroundColor: "#dbdbdb"
  },
  reloadButton: {
    width: "155px",
    fontWeight: "bold",
    color: "#181818",
    backgroundColor: "#dbdbdb",
    marginRight: "10px"
  },
  toolbarButton: {
    width: "155px",
    fontWeight: "bold",
    color: "#181818",
    backgroundColor: "#eceff1",
  },
  formControl: {
    margin: theme.spacing(3),
  },
  formComponents: {
    display: 'flex',
  },
  imageGallery: {
    marginTop: 15,
    marginLeft: 'auto',
    marginRight: 'auto',
    display: 'block'
  }
}));

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

function CanvasPagination({ imagePaths, imageMasks, resizedImages, tempFolder }) {
  const classes = useStyles();
  const theme = useTheme();
  const history = useHistory();

  const [page, setPage] = useState(1);
  const [coordsPass, setCoordsPass] = useState([]);// array of masks
  const [isCensored, setIsCensored] = useState(false);
  const [isCensoring, setIsCensoring] = useState(false);
  const [censoredImages, setCensoredImages] = useState([]);
  const [imageBlobs, setImageBlobs] =  useState([]);
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));// check if on small browser window for zoom out
  const [alertOpen, setAlert] = useState(false);

  /*
    FUNCTION FOR ZOOMING OUT ON MOBILE BROWSERS
  */
  function zoomOutMobile() {
    var viewport = document.querySelector('meta[name="viewport"]');
    if ( viewport ) {
      viewport.content = "initial-scale=0.1";
      viewport.content = "width=1200";
    }
  }
  if(fullScreen) {
    zoomOutMobile();
  }

  /*
    PRE PROCESSING OF IMAGE TO GATHER METADATA FOR VISULAIZATIONS BEFORE SCRUBBING
  */
  // this holds all metadata tags for all images
  const [allMeta, setAllMeta] = useState([]);
  // this holds the censorship options in an array
  const [censorOptions, setCensOptions] = useState([]);

  // Sets up censorship options with defaults for each image
  useEffect(async () => {
    /**Populate allMeta with allTag dictionary for each image */
    let exifs = [];// exif data from images
    let defaultOptions =
    {
      'image_name': '',
      'gaussian': true,
      'pixel_sort': true,
      'pixelization': false,
      'fill_in': false,
      'black_bar': false,
      'metaDataTags': []
    };
    // substrings to check for metadata tags with sensitive information
    let defaultMetadataSubstrings = ["make", "model", "gps", "maker", "note", "location", "name",
      "date", "datetime", "description", "software", "device",
      "longitude", "latitude", "altitude"];
    let censOptCopy = [...censorOptions];

    imagePaths.forEach((image, index) => {
      console.log(image);
      let imagePath = 'file:///'+tempFolder+'/uploadedImages/'+image;
      exifs.push(getMetadataTags(imagePath));// using getMetadataTags utility function (inside utils.js file)
      //Populate censorOptions state variable with default options for each image
      if (index < censOptCopy.length) {
        censOptCopy[index] = JSON.parse(JSON.stringify(defaultOptions));
      } else {
        censOptCopy.push(JSON.parse(JSON.stringify(defaultOptions)));
      }
      censOptCopy[index]['image_name'] = image;
    });
    exifs = await Promise.all(exifs);
    setAllMeta(exifs);
    exifs.forEach((exif, index) => {
      console.log(exif)
      for (const [key, value] of Object.entries(exif)) {
        if (new RegExp(defaultMetadataSubstrings.join("|")).test(key.toLowerCase())) {
          // At least one match
          if (censOptCopy[index]['metaDataTags'].indexOf(key) < 0) {
            censOptCopy[index]['metaDataTags'].push(key);
          }
        }
      }
    });
    setCensOptions(censOptCopy);
  }, [resizedImages]);

  /*
    HANDLING CHANGES OF PAGES
  */
  const handlePagination = (event, value) => {
    setPage(value);
  };
  const handleCoordsChange = (coords) => {
    let newCoords = coordsPass;
    newCoords[page - 1] = coords;
    setCoordsPass(newCoords);
  }

  const censorImages = async() => {
    window.api.send('censorOptions', censorOptions);
  }

  // const censorImages = async () => {
  //   setIsCensoring(true);
  //   let masks = [];
  //   coordsPass.forEach(coords => {
  //     masks.push(convertMask2dToImage(coords));
  //   });
  //   masks = await Promise.all(masks);

  //   let responseImages = [];

  //   masks.forEach((maskImage, idx) => {
  //     let form = new FormData();
  //     if(Object.prototype.toString.call(images[idx]) === "[object String]") {
  //       form.append('image', resizedImages[idx], resizedImages[idx].fileName);
  //     } else {
  //       form.append('image', images[idx], resizedImages[idx].fileName);
  //     }
  //     form.append('mask', maskImage, maskImage.fileName);

  //     let options = Object.keys(censorOptions[idx]).filter(function(key) {
  //       if (typeof censorOptions[idx][key] === "boolean") {
  //         return censorOptions[idx][key]
  //       }
  //       return false;
  //     });

  //     responseImages.push(axios({
  //       method: 'post',
  //       url: '/api/Censor' + "?options=["+options.toString()+"]&metadata=["+censorOptions[idx]['metaDataTags'].toString()+"]",
  //       data: form,
  //       headers: { 'Content-Type': `multipart/form-data; boundary=${form._boundary}`, },
  //     }).then(response => {
  //       return response.data.ImageBytes;
  //     }).catch(err=> {
  //       console.log('error: ', err);
  //       setIsCensored(false);
  //       setIsCensoring(false);
  //       setAlert(true);
  //     }));
  //   });

  //   responseImages = await Promise.all(responseImages);
  //   setImageBlobs(responseImages);
  //   let imagesTemp = [];
  //   responseImages.forEach(imageStr => {
  //     let image = new Image();
  //     image.src = 'data:image/jpeg;base64,' + imageStr;
  //     imagesTemp.push(new Promise((resolve, reject) => {
  //       image.onload = () => {
  //         resolve(image);
  //         reject('image not censored');
  //       }
  //     }));
  //   });
  //   imagesTemp = await Promise.all(imagesTemp);
  //   setCensoredImages(imagesTemp);

  //   setIsCensored(true);
  //   setIsCensoring(false);
  // }

  useEffect(() => {
    setCoordsPass(imageMasks);
    
  }, [imageMasks]);

  // const download = () => {
  //   downloadImages(imageBlobs, images.map(x => x.name));
  //   //setIsCensored(false); // temp
  // }

  const reload = () => {
    history.go(0);
  }

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setAlert(false);
  };

  // const ImageComponent = ({img}) => { <img src={img.src} alt="censored image" />}


  if (isCensoring) {
    return (
      <Container className={classes.root}>
        <LinearProgress />
      </Container>
    );
  } else {
    return (
      <Container>
        {/* Toolbar Components */}
        <Grid container>
          {isCensored
            ?
            <Paper style={{width: '100%', height: '100%', marginTop: 15, padding: 15}}>
              <Grid container direction="row" justify="center" alignItems="center">
                <Grid item xs={12}>
                  <Grid container direction="row" justify="center" alignItems="center">
                    {/* <Button size='small' className={classes.reloadButton} onClick={reload}>
                      New Image
                      </Button>
                    <Button size='small' className={classes.downloadButton} onClick={download}>
                      Download
                    </Button> */}
                  </Grid>
                </Grid>
                <Grid item xs={12}>
                  <img 
                    className={classes.imageGallery} 
                    src={censoredImages[page-1].src} 
                    width={imageMasks[page-1][0].length} 
                    height={imageMasks[page-1].length}
                  />
                </Grid>
              </Grid>
            </Paper>
            : 
            <Paper style={{width: '100%', height: '100%', marginTop: 15, padding: 15}}>
            <Grid item xs={12}>
              <CensorshipOptionsDialog
                censorOptions={censorOptions}
                setCensorOpt={setCensOptions}
                pagenum={page}
                metadata={allMeta}
                setPage={handlePagination}
              />
              <Button size='small' className={classes.censorButton} onClick={censorImages}>
                Censor
                </Button>
              <Canvas
                image={resizedImages[page - 1]}
                coordsPass={coordsPass[page - 1]}
                setCoordsPass={handleCoordsChange}
              />
            </Grid>
            <Snackbar open={alertOpen} autoHideDuration={6000} onClose={handleClose}>
              <Alert onClose={handleClose} severity="error">
                An error occured while uploading your images. Please try again later
              </Alert>
            </Snackbar>
            </Paper>
          }
        </Grid>
        {/* Pagination Component */}
        <Grid container justifyContent="center">
          {resizedImages.length > 1
            ?
            <Pagination
              size="small"
              className={classes.pagination}
              count={resizedImages.length}
              variant="outlined"
              page={page}
              onChange={handlePagination}
            />
            : null
          }
        </Grid>
      </Container>
    );
  }
}

export default CanvasPagination;