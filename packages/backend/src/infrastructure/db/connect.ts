import mongoose from "mongoose";
export async function connectDB(uri: string): Promise<void> {
  mongoose.connection.on("connected", () => console.log("MongoDB connected"));
  mongoose.connection.on("error", () => console.log("MongoDB error"));
  mongoose.connection.on("disconnected", () =>
    console.log("MongoDB disconnected"),
  );

  await mongoose.connect(uri);
}
