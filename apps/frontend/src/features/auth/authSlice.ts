import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const TOKEN_KEY = "beetbite.token";

interface AuthState {
  token: string | null;
}

const initialState: AuthState = {
  token: localStorage.getItem(TOKEN_KEY),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string }>) {
      state.token = action.payload.token;
      localStorage.setItem(TOKEN_KEY, action.payload.token);
    },
    logout(state) {
      state.token = null;
      localStorage.removeItem(TOKEN_KEY);
    },
    rehydrate(state) {
      state.token = localStorage.getItem(TOKEN_KEY);
    },
  },
});

export const { setCredentials, logout, rehydrate } = authSlice.actions;
export default authSlice.reducer;
