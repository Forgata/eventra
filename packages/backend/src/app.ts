import express, { type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import { authRouter } from "./modules/auth/index.js";
const app = express();

app.use(express.json());
app.use(cookieParser());
app.use("/api/public/auth", authRouter);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

export default app;
