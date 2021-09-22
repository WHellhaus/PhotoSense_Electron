import React from "react";
import { ConnectedRouter } from "connected-react-router";
import { Provider } from "react-redux";
import { createTheme, ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import Container from '@material-ui/core/Container';
import Routes from "Core/routes";
import Nav from "./nav";
import "./root.css";



function Root(props) {
  // render() {
    const { store, history } = props;

    const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

    const theme = createTheme({
      palette: {
        type: prefersDarkMode ? 'dark' : 'light',
        primary: {
          main: '#1976d2',
        },
        secondary: {
          main: '#ec407a',
        },background: {
          paper: prefersDarkMode ? '#303030' : '#fff',
          default: prefersDarkMode ? '#212121' : '#fafafa'
        }
      }
    });

    return (
      <ThemeProvider theme={theme}>
        <Provider store={store}>
          <Container>
            <CssBaseline />
            <ConnectedRouter history={history}>
              <Nav history={history}></Nav>
              <Routes></Routes>
            </ConnectedRouter>
          </Container>
        </Provider>
      </ThemeProvider>
    );
  // }
}

export default Root;
