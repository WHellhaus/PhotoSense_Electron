import { createSlice } from "@reduxjs/toolkit";

const canvasSlice = createSlice({
  name: 'canvas',
  initialState: [],
  reducers: {
    // Creates new 2D array from height and width of image for state
    add_canvas: (state, action) => {
      state.push(Array.from({ length: action.payload['height'] }, () => Array.from({ length: action.payload['width'] }, () => false)))
    },
    update_canvas: (state, action) => {
      let idx = action.payload['index'];
      let imageData = action.payload['imageData'];
      // console.log(`state: ${state[idx].length}`);
      // console.log(`imageData: ${Math.min(imageData[(0 * state[idx][0].length + 0) * 4 + 4], 1)}`);
      for (let x = 0; x < state[idx].length; x++) {
        for (let y = 0; y < state[idx][0].length; y++) {
          // 4 bytes for each channel color and need the 4th channel (alpha) to compute
          if (state[idx][x][y] != Math.min(imageData[(x * state[idx][0].length + y) * 4 + 4], 1)) {
            state[idx][x][y] = !state[idx][x][y];
          }
        }
      }
    }

  }
});

// Export actions
export const { add_canvas, update_canvas } = canvasSlice.actions;

// Export reducer
export default canvasSlice.reducer;