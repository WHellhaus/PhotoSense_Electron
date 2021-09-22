import React, { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles( () => ({
    cursor: (props) => ({
        width: props.size*2,
        height: props.size*2,
        border: '2px solid black',
        borderRadius: '50%',
        backgroung: 'transparent',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        position: 'absolute',
        zIndex: 100
    }),
}));

const Cursor = (props) => {
    const classes = useStyles(props);

    return (
        <div
            className={classes.cursor}
            id="cursor"
        />
    );
};

export default Cursor;