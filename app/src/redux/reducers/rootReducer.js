import { combineReducers } from "redux";
import { connectRouter } from "connected-react-router";
import undoable from "easy-redux-undo";
import homeReducer from "../components/home/homeSlice";
import counterReducer from "../components/counter/counterSlice";
import complexReducer from "../components/complex/complexSlice";
import canvasReducer from '../components/canvas/canvasSlice';

const rootReducer = (history) =>
  combineReducers({
    router: connectRouter(history),
    home: homeReducer,
    canvas: canvasReducer,
    undoable: undoable(
      combineReducers({
        counter: counterReducer,
        complex: complexReducer,
        // canvas: canvasReducer
      })
    )
  });

export default rootReducer;
