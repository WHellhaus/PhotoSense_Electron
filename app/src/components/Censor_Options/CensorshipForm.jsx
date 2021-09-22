import React, { useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import FormLabel from '@material-ui/core/FormLabel';
import FormControl from '@material-ui/core/FormControl';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import Switch from '@material-ui/core/Switch';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText';
import IconButton from '@material-ui/core/IconButton';
import InfoIcon from '@material-ui/icons/Info';
import Tooltip from '@material-ui/core/Tooltip';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
  },
  formControl: {
    margin: theme.spacing(3),
  }
}));

export default function CensorshipForm({page, metaData, setCensorOpt, censorOptions}) {
  const keys = Object.keys(metaData[page-1]);
  const classes = useStyles();
  // meta switch 
  const [enableMeta, setMetaState] = React.useState(false); 

  //metadata Checkboxes V V 
 const [checked, setChecked] = React.useState(
  Array.from({length: metaData.length}, (v, index) => {
    return Array.from(Object.keys(metaData[index]), x => {
      return (censorOptions[index]['metaDataTags'].indexOf(x) > -1 ? true : false);
    })
  }
  ) 
); 
  
  // censorship checkboxes
  const handleCheckboxChange = (event) => {
    let copy = [...censorOptions];
    copy[page-1][event.target.name] = event.target.checked;
    setCensorOpt(copy); 
  };

  const handleMetaCheckboxChange = (event) => {
    let copy = [...censorOptions];
    let checkedCopy = [...checked];
    if(event.target.checked) {
      let index = copy[page-1]['metaDataTags'].indexOf(event.target.name)
      if (index < 0)
        copy[page-1]['metaDataTags'].push(event.target.name);
    } else {
      let index = copy[page-1]['metaDataTags'].indexOf(event.target.name)
      if (index > -1)
        copy[page-1]['metaDataTags'].splice(index, 1);
      setMetaState(false);
    }
    checkedCopy[page-1][parseInt(event.target.id.substring(5))] = !checkedCopy[page-1][parseInt(event.target.id.substring(5))];
    setCensorOpt(copy);
    setChecked(checkedCopy);
  }
  // full scrub toggle
  const handleMetaChange = (event) => { 
    let copy = [...censorOptions];
    let checkedCopy = [...checked];
    if(enableMeta) {
      checkedCopy[page-1].forEach((v, i) => {
        checkedCopy[page-1][i] = false;
      })
      copy[page-1]['metaDataTags'] = [];
    } else {
      checkedCopy[page-1].forEach((v, i) => {
        checkedCopy[page-1][i] = true;
      })
      copy[page-1]['metaDataTags'] = Object.keys(metaData[page-1]);
    }
    setMetaState(event.target.checked); 
    setCensorOpt(copy);
    setChecked(checkedCopy);
  }; 
// end metadata Checkboxes ^ ^

  return (
    <div className={classes.root}>
      {/* Checkbox Components */}
        
        <FormGroup>
        <FormControl component="fieldset" className={classes.formControl}>
        <FormLabel >Select Censoring Algorithm(s)</FormLabel>
          <FormControlLabel
            control={<Checkbox checked={censorOptions[page-1]['pixel_sort']} onChange={handleCheckboxChange} name="pixel_sort" />}
            label="Pixel Sorting"
          />
          <FormControlLabel
            control={<Checkbox checked={censorOptions[page-1]['gaussian']} onChange={handleCheckboxChange} name="gaussian" />}
            label="Simple Blurring"
          />
          <FormControlLabel
            control={<Checkbox checked={censorOptions[page-1]['pixelization']} onChange={handleCheckboxChange} name="pixelization" />}
            label="Pixelization"
          />
          <FormControlLabel
            control={<Checkbox checked={censorOptions[page-1]['black_bar']} onChange={handleCheckboxChange} name="black_bar" />}
            label="Black Bar Censoring"
          />
          <FormControlLabel
            control={<Checkbox checked={censorOptions[page-1]['fill_in']} onChange={handleCheckboxChange} name="fill_in" />}
            label="Fill In Censoring"
          />
          </FormControl>
        </FormGroup>

      <FormGroup>
      <FormControl component="fieldset" className={classes.formControl}>
      <FormLabel component="legend">Select Metadata Tags to Scrub</FormLabel>
      <FormControlLabel
        control={
          <Switch
          checked={enableMeta}
          onChange={handleMetaChange}
          name="Full Scrub"
          inputProps={{ 'aria-label': 'secondary checkbox' }}
          />
        }
        label="Full Scrub"
      />
    
      <List style={{maxHeight: '50%', overflow: 'auto'}}>{keys.map((value, index) => {
        const labelId = `checkbox-list-label-${value}`;
        return (
          <ListItem key={value} role={undefined} dense button>
            <ListItemIcon>
              <Checkbox
                edge="start"
                checked={checked[page-1][index]}
                tabIndex={-1}
                disableRipple
                name={value}
                id={"meta_"+index}
                inputProps={{ 'aria-labelledby': labelId }}
                onChange={handleMetaCheckboxChange}
              />
            </ListItemIcon>
            <ListItemText id={labelId} primary={`${value}`} />
            <ListItemSecondaryAction>
            <Tooltip title={`${metaData[page-1][value]}`} placement = 'right'>
            <IconButton edge="end" aria-label="info">
                <InfoIcon />
              </IconButton>
            </Tooltip>
            </ListItemSecondaryAction>
          </ListItem>
        );
        
      })}
    </List>

    </FormControl>
    </FormGroup>
    </div>
  );
}