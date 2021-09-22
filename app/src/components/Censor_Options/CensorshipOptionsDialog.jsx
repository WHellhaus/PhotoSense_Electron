import React from 'react';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { useTheme, makeStyles } from '@material-ui/core/styles';
// form component
import CensorshipForm from './CensorshipForm.jsx'; 
import Pagination from '@material-ui/lab/Pagination';
import Grid from '@material-ui/core/Grid';


const useStyles = makeStyles((theme) => ({
  toolbarButton: {
      width: "155px",
      fontWeight: "bold",
      color: "#181818",
      backgroundColor: "#eceff1",
  },
  paginationGrid: {
      marginTop: 10,
  }
}));

export default function CensorshipOptionsDialog({pagenum, metadata, setPage, censorOptions, setCensorOpt}) {

  const [open, setOpen] = React.useState(false);
  const classes  = useStyles(); 
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleClickOpen = () => {
    setOpen(true); 
  }
  const handleClickClose = () => {
    document.querySelector("#canvas").dispatchEvent(new Event('dialogClose'))
    setOpen(false); 
  }

  return (
    <div style={{display : 'inline-block'}}>
      <Button size='small' className={classes.toolbarButton} onClick={handleClickOpen}>
        Select Options
      </Button>
      <Dialog fullScreen={fullScreen} open={open} onClose={handleClickClose}
        aria-labelledby="responsive-dialog-title"
      >
        <DialogContent>
          <CensorshipForm page={pagenum} metaData={metadata} censorOptions={censorOptions} setCensorOpt={setCensorOpt}/>
        </DialogContent>

        <Grid container justify="center" className={classes.paginationGrid}>
          {metadata.length > 1
            ? <Pagination
              size="small"
              className={classes.pagination}
              count={metadata.length}
              variant="outlined"
              page={pagenum}
              onChange={setPage}
            /> : null
          }
        </Grid>

        <DialogActions>
          <Button onClick={handleClickClose} color="primary" autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}